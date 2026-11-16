/**
 * DiagramControl — WebGME "control" counterpart to the canvas widget.
 *
 * Widget (DiagramCanvas / SelectionOverlay / Monaco panel) reports intents.
 * Control owns model mutation + deciding when to re-render.
 *
 * Apply from Monaco is manual. Keystrokes are collected as editor changes.
 * Apply folds those changes into diagram-level line operations. Reading a
 * line operation as a flowchart edge or a sequence message comes after that.
 */

import { setDiagramSource } from '../data/projectDocument.js';
import { isDemoRuntime } from './runtime.js';
import {
  createSession,
  foldEdits,
  formatDiagramOperation,
  noteContentChanges
} from './sourceEdits.cjs';

/**
 * @typedef {object} ApplyResult
 * @property {'applied-local'|'pending-delta'|'error'} status
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
   * @param {{ diagramNodePath?: string|null, nodePaths?: Array<string|null> }} [references]
   */
  openEditor(diagramKey, source, references) {
    const refs = references || {};
    const existing = this._sessions.get(diagramKey);
    if (!existing || (!existing.edits.length && this.getBaseline(diagramKey) !== source)) {
      this.setBaseline(diagramKey, source, refs);
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
  async applySource({ diagramKey, domainId, modelingDomainId, name, source }) {
    const session = this.sessionFor(diagramKey);
    const baseline = this.getBaseline(diagramKey);
    if (!session.edits.length && baseline === source) {
      return { status: 'applied-local', message: 'No changes vs baseline', delta: { operations: [] } };
    }

    const folded = foldEdits(session);
    const operations = folded.operations;

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

    this.onLog(
      isDemoRuntime()
        ? 'Diagram operations are collected. This diagram type does not apply them to elements yet.'
        : 'Saved the diagram source. This diagram type does not apply the operations to elements yet.'
    );

    return {
      status: 'pending-delta',
      message: `${operations.length} diagram operation${operations.length === 1 ? '' : 's'} collected for ${domainId}.`,
      delta: { operations }
    };
  }
}
