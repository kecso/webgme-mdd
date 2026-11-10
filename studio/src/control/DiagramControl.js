/**
 * DiagramControl — WebGME "control" counterpart to the canvas widget.
 *
 * Widget (DiagramCanvas / SelectionOverlay / Monaco panel) reports intents.
 * Control owns model mutation + deciding when to re-render.
 *
 * Apply from Monaco is **manual** (no live debounce into WebGME): we must
 * re-import text via a clever operation delta instead of wipe+reinsert.
 */

import { setDiagramSource } from '../data/demoStore.js';

/**
 * @typedef {object} ApplyResult
 * @property {'applied-local'|'pending-delta'|'error'} status
 * @property {string} [message]
 * @property {object} [delta]  // TODO shape once ImportDelta exists
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
  }

  setBaseline(diagramKey, source) {
    this._baselineByDiagram.set(diagramKey, source);
  }

  getBaseline(diagramKey) {
    return this._baselineByDiagram.get(diagramKey) ?? '';
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
  async applySource({ diagramKey, domainId, name, source }) {
    const baseline = this.getBaseline(diagramKey);
    const delta = computeSourceDelta(baseline, source);

    this.onLog(
      `apply requested for ${diagramKey}: ${delta.kind}` +
        (delta.kind === 'unchanged' ? '' : ` (~${delta.roughChangeChars} chars touched)`)
    );

    if (delta.kind === 'unchanged') {
      return { status: 'applied-local', message: 'No changes vs baseline', delta };
    }

    // --- Demo / view path: update local store + refresh view immediately ---
    setDiagramSource(this.projectId, diagramKey, {
      domainId,
      name,
      source,
      updatedAt: new Date().toISOString()
    });
    this.setBaseline(diagramKey, source);
    this.onViewSource(diagramKey, source);

    // --- Production path (not wired yet) ---
    // TODO(webgme-delta):
    // 1. Parse baseline AST + new AST (MermaidAst / EarsAst / @mermaid-js/parser).
    // 2. Diff nodes/edges by stable ids → { add, remove, update attrs, rewire pointers }.
    // 3. Apply Core createNode / deleteNode / setAttribute / setPointer only for delta.
    // 4. Avoid deleting the whole Diagram subtree and re-importing.
    // 5. On success, ExportMermaid again and setBaseline; then widget re-renders.
    // 6. On conflict / unparseable: keep buffer, surface error, do not commit.
    this.onLog(
      'TODO: ImportDelta — local view updated; WebGME Core delta apply not wired yet'
    );

    return {
      status: 'pending-delta',
      message:
        'View updated locally. WebGME delta re-import is TODO (manual apply keeps wipe/replace off the table).',
      delta
    };
  }
}

/**
 * Lightweight textual delta hint until AST diff exists.
 * Not a substitute for structural ImportDelta — only enough to skip no-ops
 * and log intent.
 */
export function computeSourceDelta(baseline, next) {
  const a = String(baseline || '');
  const b = String(next || '');
  if (a === b) {
    return { kind: 'unchanged', roughChangeChars: 0 };
  }
  if (!a && b) {
    return { kind: 'create', roughChangeChars: b.length };
  }
  // TODO(webgme-delta): replace with AST structural diff
  let i = 0;
  const min = Math.min(a.length, b.length);
  while (i < min && a[i] === b[i]) i += 1;
  let j = 0;
  while (j < min - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j += 1;
  const roughChangeChars = Math.max(a.length, b.length) - i - j;
  return {
    kind: 'text-edit',
    roughChangeChars,
    // Placeholder fields for future ImportDelta
    addedIds: [],
    removedIds: [],
    updatedIds: []
  };
}
