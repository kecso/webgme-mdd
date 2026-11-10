/**
 * Hideable Monaco panel — Mermaid Live Editor–style source editing.
 * Updates to the model/view are **manual** via Apply (ImportDelta TODO).
 * Draft buffer lives in the parent so Hide does not discard unsaved edits.
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
  dirty
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
            disabled={applyBusy || !dirty}
            onClick={() => onApply()}
            title="Manually re-import into the model (delta TODO) and re-render"
          >
            {applyBusy ? 'Applying…' : 'Apply to model'}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Hide
          </button>
        </div>
      </header>
      <p className="source-hint">
        Live typing does <em>not</em> update WebGME. Apply runs a controlled re-import
        (TODO: structural delta — not wipe-and-reinsert).
      </p>
      <div className="source-editor">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={draft}
          onChange={(v) => onDraftChange(v ?? '')}
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
