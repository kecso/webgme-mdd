import React from 'react';
import { domainLabel } from '../data/modelingDomains.js';

export default function Inspector({
  domainId,
  modelingDomainId,
  selectedId,
  diagramKey,
  log
}) {
  return (
    <aside className="inspector">
      <div className="rail-title">Inspector</div>
      <dl className="kv">
        <dt>Instance</dt>
        <dd>{diagramKey || '—'}</dd>
        <dt>Modeling domain</dt>
        <dd>
          {modelingDomainId ? domainLabel(modelingDomainId) : '—'}
          {modelingDomainId ? <small className="block-id">{modelingDomainId}</small> : null}
        </dd>
        <dt>View language</dt>
        <dd>{domainId || '—'}</dd>
        <dt>Selection</dt>
        <dd>{selectedId || '—'}</dd>
      </dl>
      <p className="hint">
        Overlay selection maps SVG <code>id</code>/<code>data-id</code> → model element.
        Translators are domain→view couplings (TODO: Core setAttribute / ImportDelta).
      </p>
      <div className="rail-title">Control log</div>
      <pre className="log">{(log || []).slice(-12).join('\n') || '—'}</pre>
    </aside>
  );
}
