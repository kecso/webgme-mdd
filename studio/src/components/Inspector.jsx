import React from 'react';

export default function Inspector({ domainId, selectedId, diagramKey, log }) {
  return (
    <aside className="inspector">
      <div className="rail-title">Inspector</div>
      <dl className="kv">
        <dt>Diagram</dt>
        <dd>{diagramKey || '—'}</dd>
        <dt>Domain</dt>
        <dd>{domainId || '—'}</dd>
        <dt>Selection</dt>
        <dd>{selectedId || '—'}</dd>
      </dl>
      <p className="hint">
        Overlay selection maps SVG <code>id</code>/<code>data-id</code> → model element.
        Attribute edits will go through DiagramControl (TODO: Core setAttribute).
      </p>
      <div className="rail-title">Control log</div>
      <pre className="log">{(log || []).slice(-12).join('\n') || '—'}</pre>
    </aside>
  );
}
