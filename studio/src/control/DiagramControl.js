/**
 * DiagramControl — WebGME "control" counterpart to the canvas widget.
 *
 * Widget (DiagramCanvas / SelectionOverlay / Monaco panel) reports intents.
 * Control owns model mutation + deciding when to re-render.
 *
 * Apply from Monaco is manual. Keystrokes are collected as editor changes.
 * Apply asks Mermaid to parse the current text, then folds the edits into
 * diagram-level line operations. The walker for that diagram type runs inside
 * one WebGME transaction. Text Mermaid rejects is not written.
 */

import { applyDiagramModel, setDiagramSource } from '../data/projectDocument.js';
import { isDemoRuntime } from './runtime.js';
import { inputForApply, sessionHasLinks } from './applyModel.cjs';
import { checkDiagram } from './diagramCheck.cjs';
import {
  createSession,
  foldEdits,
  formatDiagramOperation,
  noteContentChanges,
  sourceToLines
} from './sourceEdits.cjs';

/**
 * @typedef {object} ApplyResult
 * @property {'applied-local'|'pending-delta'|'applied'|'invalid'|'type-change'|'error'} status
 * @property {string} [message]
 * @property {object} [delta]
 * @property {Array<object>} [delta.operations]  diagram-level line operations
 */

export class DiagramControl {
  /**
   * @param {object} opts
   * @param {string} opts.projectId
   * @param {(msg: string) => void} [opts.onLog]
   * @param {(diagramKey: string, source: string) => void} [opts.onViewSource]
   */
  constructor({ projectId, onLog, onViewSource }) {
    this.projectId = projectId;
    this.onLog = onLog || (() => {});
    this.onViewSource = onViewSource || (() => {});
    /** @type {Map<string, string>} last source known to match the view / model export */
    this._baselineByDiagram = new Map();
    /** @type {Map<string, object>} line ids plus the Monaco edits since that baseline */
    this._sessions = new Map();
  }

  setBaseline(diagramKey, source, references) {
    this._baselineByDiagram.set(diagramKey, source);
    this._sessions.set(diagramKey, createSession(source, references));
  }

  getBaseline(diagramKey) {
    return this._baselineByDiagram.get(diagramKey) ?? '';
  }

  /**
   * Snapshot taken when the source editor opens. The text is the baseline,
   * and each line keeps the WebGME node it already referred to.
   * Hiding the editor does not drop edits already collected for this snapshot.
   * @param {string} diagramKey
   * @param {string} source
   * @param {{ diagramNodePath?: string|null, nodePaths?: Array<string|null>, names?: Object<string, string> }} [references]
   */
  openEditor(diagramKey, source, references) {
    const refs = references || {};
    const existing = this._sessions.get(diagramKey);
    if (!existing || (!existing.edits.length && this.getBaseline(diagramKey) !== source)) {
      const sameShape = existing && existing.lines.length === sourceToLines(source).length;
      const incomingPaths = refs.nodePaths || [];
      const incomingNames = refs.names || {};
      this.setBaseline(diagramKey, source, {
        diagramNodePath: refs.diagramNodePath || (existing && existing.diagramNodePath) || null,
        nodePaths: incomingPaths.length || !sameShape
          ? incomingPaths
          : existing.lines.map((line) => line.nodePath),
        names: Object.keys(incomingNames).length || !existing
          ? incomingNames
          : existing.names
      });
      this._sessions.get(diagramKey).editorOpen = true;
      this._logBaseline(diagramKey);
      return;
    }
    const firstOpen = !existing.editorOpen;
    existing.editorOpen = true;
    if (!existing.diagramNodePath && refs.diagramNodePath) {
      existing.diagramNodePath = refs.diagramNodePath;
    }
    const paths = refs.nodePaths || [];
    existing.lines.forEach((line, index) => {
      if (!line.nodePath && paths[index]) line.nodePath = paths[index];
    });
    existing.names = existing.names || {};
    Object.entries(refs.names || {}).forEach(([name, nodePath]) => {
      if (name && nodePath && !existing.names[name]) existing.names[name] = nodePath;
    });
    if (firstOpen) this._logBaseline(diagramKey);
  }

  _logBaseline(diagramKey) {
    const session = this._sessions.get(diagramKey);
    if (!session) return;
    const linked = session.lines.filter((line) => line.nodePath).length;
    this.onLog(
      `editor baseline ${session.diagramNodePath || diagramKey}` +
        ` (${session.lines.length} lines, ${linked} linked)`
    );
  }

  sessionFor(diagramKey) {
    let session = this._sessions.get(diagramKey);
    if (!session) {
      session = createSession(this.getBaseline(diagramKey));
      this._sessions.set(diagramKey, session);
    }
    return session;
  }

  /**
   * A Monaco content change from the source panel. Programmatic resets are ignored.
   * @param {string} diagramKey
   * @param {object} event  IModelContentChangedEvent
   */
  noteContentChange(diagramKey, event) {
    if (!diagramKey) return;
    noteContentChanges(this.sessionFor(diagramKey), event);
  }

  /**
   * Widget selection → control. Later: set activeNode / highlight territory.
   * @param {string|null} elementId  Mermaid/source element id from SvgIndex
   */
  selectElement(elementId) {
    this.onLog(elementId ? `select element ${elementId}` : 'clear selection');
    // TODO(webgme): map elementId → Core node path; setActiveNode / inspector attrs
  }

  /**
   * Manual apply from Monaco (or equivalent). Does **not** auto-run on keystroke.
   *
   * @param {object} args
   * @param {string} args.diagramKey
   * @param {string} args.domainId
   * @param {string} args.name
   * @param {string} args.source  editor buffer
   * @returns {Promise<ApplyResult>}
   */
  async applySource({ diagramKey, domainId, modelingDomainId, name, source, options }) {
    const session = this.sessionFor(diagramKey);
    const baseline = this.getBaseline(diagramKey);
    const linked = sessionHasLinks(session);
    if (!session.edits.length && baseline === source && (isDemoRuntime() || linked || session.settled)) {
      return { status: 'applied-local', message: 'No changes vs baseline', delta: { operations: [] } };
    }

    const folded = foldEdits(session);
    const verdict = await checkDiagram(domainId, folded.lines);
    if (!verdict.ok) {
      this.onLog(verdict.message);
      return {
        status: verdict.code === 'type-change' ? 'type-change' : 'invalid',
        message: verdict.message,
        delta: { operations: folded.operations }
      };
    }
    const walked = inputForApply(session, folded);
    walked.baseline.options = options || {};
    const operations = walked.operations;

    this.onLog(
      `apply requested for ${diagramKey}` +
        (modelingDomainId ? ` [${modelingDomainId}→${domainId}]` : '') +
        (operations.length
          ? `: ${operations.map(formatDiagramOperation).join(', ')}`
          : ': no diagram operations')
    );

    if (!operations.length) {
      session.edits = [];
      if (baseline !== source) {
        await setDiagramSource(this.projectId, diagramKey, {
          diagramType: domainId,
          modelingDomainId,
          name,
          source,
          updatedAt: new Date().toISOString()
        });
        this._baselineByDiagram.set(diagramKey, source);
        session.lines = folded.lines;
        this.onViewSource(diagramKey, source);
      }
      return {
        status: 'applied-local',
        message: 'No diagram operations',
        delta: { operations }
      };
    }

    if (isDemoRuntime()) {
      await setDiagramSource(this.projectId, diagramKey, {
        diagramType: domainId,
        modelingDomainId,
        name,
        source,
        updatedAt: new Date().toISOString()
      });
      this._baselineByDiagram.set(diagramKey, source);
      session.lines = folded.lines;
      session.edits = [];
      this.onViewSource(diagramKey, source);
      this.onLog('Diagram operations are collected. The demo copy does not write them to elements.');
      return {
        status: 'pending-delta',
        message: `${operations.length} diagram operation${operations.length === 1 ? '' : 's'} collected for ${domainId}.`,
        delta: { operations }
      };
    }

    const diagramNodePath = session.diagramNodePath ||
      (String(diagramKey).startsWith('/') ? diagramKey : null);
    if (!diagramNodePath) throw new Error('This diagram has no WebGME node to update.');
    session.diagramNodePath = diagramNodePath;

    const { outcome } = await applyDiagramModel(this.projectId, diagramKey, {
      diagramType: domainId,
      diagramNodePath,
      baseline: walked.baseline,
      lineOperations: operations,
      source,
      lines: folded.lines
    });

    session.lines = outcome.lines || folded.lines;
    session.names = outcome.names || {};
    session.edits = [];
    session.settled = true;
    this._baselineByDiagram.set(diagramKey, source);
    this.onViewSource(diagramKey, source);

    if (outcome.status === 'applied') {
      const notes = (outcome.skipped || []).map((item) => item.reason).filter(Boolean);
      if (notes.length) this.onLog(notes.join(' '));
      this.onLog('Committed the diagram source and element operations in one transaction.');
      return {
        status: 'applied',
        message: `Applied the line edits to the ${domainId} model.`,
        delta: { operations }
      };
    }

    this.onLog(outcome.reason || 'Saved the diagram source.');
    return {
      status: 'pending-delta',
      message: outcome.reason || 'Saved the diagram source.',
      delta: { operations }
    };
  }
}
