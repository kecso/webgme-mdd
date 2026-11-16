/**
 * Hideable Monaco panel — Mermaid Live Editor–style source editing.
 * Updates to the model/view are manual via Apply.
 * The draft lives in the parent, so Hide does not discard unsaved edits.
 * Monaco content changes are reported upward so Apply can fold them.
 */
import React from 'react';
import Editor from '@monaco-editor/react';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.domainId
 * @param {string} props.diagramKey
 * @param {string} props.draft  current editor buffer (may differ from applied view)
 * @param {(next: string) => void} props.onDraftChange
 * @param {() => Promise<void>} props.onApply
 * @param {boolean} props.applyBusy
 * @param {string} [props.statusMessage]
 * @param {boolean} props.dirty
 * @param {(diagramKey: string) => void} [props.onEditorOpen]
 * @param {(diagramKey: string, event: object) => void} [props.onContentChange]
 */
export default function SourceEditorPanel({
  open,
  onClose,
  domainId,
  diagramKey,
  draft,
  onDraftChange,
  onApply,
  applyBusy,
  statusMessage,
  dirty,
  onEditorOpen,
  onContentChange
}) {
  if (!open) return null;

  const language = domainId === 'ears' ? 'plaintext' : 'markdown';

  return (
    <aside className="source-panel" aria-label="Mermaid source editor">
      <header className="source-panel-header">
        <div>
          <strong>Source</strong>
          <span className="muted">
            {diagramKey} · {domainId}
            {dirty ? ' · unsaved draft' : ''}
          </span>
        </div>
        <div className="source-actions">
          <button
            type="button"
            className="btn primary"
            disabled={applyBusy || !diagramKey || diagramKey === '—'}
            onClick={() => onApply()}
            title="Write the diagram text and its elements"
          >
            {applyBusy ? 'Applying…' : 'Apply to model'}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Hide
          </button>
        </div>
      </header>
      <p className="source-hint">
        Live typing does <em>not</em> update WebGME. Apply folds the edits into diagram operations.
      </p>
      <div className="source-editor">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={draft}
          onMount={() => {
            if (onEditorOpen) onEditorOpen(diagramKey);
          }}
          onChange={(value, event) => {
            onDraftChange(value ?? '');
            if (onContentChange && event && !event.isFlush) onContentChange(diagramKey, event);
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true
          }}
        />
      </div>
      {statusMessage ? <footer className="source-status">{statusMessage}</footer> : null}
      {/* TODO: Monaco mermaid language + error markers via mermaid.parse (live-editor parity) */}
    </aside>
  );
}
