import React, { useEffect, useMemo, useState } from 'react';
import {
  couplingsForDomain,
  domainLabel,
  findDiagramMeta
} from '../data/modelingDomains.js';

/**
 * Single create control: floating multi-step
 * modeling domain (enabled only) → diagram type allowed by that domain → name.
 */
export default function NewDiagramFab({
  open,
  onOpen,
  onClose,
  catalog,
  enabledModelingDomains,
  onCreate,
  onOpenDomains
}) {
  const [step, setStep] = useState(1);
  const [modelingDomainId, setModelingDomainId] = useState(null);
  const [diagramType, setDiagramType] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setStep(1);
      setModelingDomainId(null);
      setDiagramType(null);
      setName('');
      setError('');
    }
  }, [open]);

  const domains = useMemo(() => {
    const enabled = new Set(enabledModelingDomains || []);
    return [...enabled]
      .map((id) => ({
        id,
        name: domainLabel(id),
        couplings: couplingsForDomain(catalog, id)
      }))
      .filter((d) => d.couplings.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [enabledModelingDomains, catalog]);

  const selectedDomain = domains.find((d) => d.id === modelingDomainId);
  const couplings = selectedDomain?.couplings || [];
  const allowedTypeIds = new Set(couplings.map((c) => c.diagramType));

  const finish = () => {
    setError('');
    if (!modelingDomainId || !(enabledModelingDomains || []).includes(modelingDomainId)) {
      setError('Pick an enabled modeling domain ( Domains settings ).');
      return;
    }
    if (!diagramType || !allowedTypeIds.has(diagramType)) {
      setError('That view is not allowed for the selected domain.');
      return;
    }
    const meta = findDiagramMeta(catalog, diagramType);
    const safe =
      (name.trim() || `${diagramType}-1`).replace(/[^\w.-]+/g, '-') || diagramType;
    onCreate({
      modelingDomainId,
      diagramType,
      name: safe,
      displayName: meta?.name || diagramType
    });
    onClose();
  };

  return (
    <div className="fab-root">
      {!open ? (
        <button
          type="button"
          className="fab"
          title="New diagram"
          aria-label="New diagram"
          onClick={onOpen}
        >
          +
        </button>
      ) : (
        <div className="fab-panel" role="dialog" aria-label="Create diagram">
          <header className="fab-head">
            <div>
              <p className="eyebrow">New diagram</p>
              <strong>
                {step === 1 && 'Choose modeling domain'}
                {step === 2 && 'Choose view language'}
                {step === 3 && 'Name instance'}
              </strong>
            </div>
            <button type="button" className="btn tiny" onClick={onClose}>
              ✕
            </button>
          </header>

          <div className="fab-steps" aria-hidden>
            <span className={step >= 1 ? 'on' : ''} />
            <span className={step >= 2 ? 'on' : ''} />
            <span className={step >= 3 ? 'on' : ''} />
          </div>

          {step === 1 ? (
            <ul className="fab-list">
              {domains.length === 0 ? (
                <li className="empty">
                  No enabled modeling domains with views.
                  {onOpenDomains ? (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="btn tiny"
                        onClick={() => {
                          onClose();
                          onOpenDomains();
                        }}
                      >
                        Open Domains
                      </button>
                    </>
                  ) : null}
                </li>
              ) : (
                domains.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setModelingDomainId(d.id);
                        setDiagramType(null);
                        setStep(2);
                      }}
                    >
                      <span>{d.name}</span>
                      <small>
                        {d.couplings.map((c) => c.diagramType).join(', ')}
                      </small>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}

          {step === 2 ? (
            <ul className="fab-list">
              <li className="fab-back">
                <button type="button" className="btn tiny" onClick={() => setStep(1)}>
                  ← {domainLabel(modelingDomainId)}
                </button>
              </li>
              {couplings.map((c) => {
                const meta = findDiagramMeta(catalog, c.diagramType);
                return (
                  <li key={c.diagramType}>
                    <button
                      type="button"
                      onClick={() => {
                        setDiagramType(c.diagramType);
                        setName(`${c.diagramType}-1`);
                        setStep(3);
                      }}
                    >
                      <span>{meta?.name || c.diagramType}</span>
                      <small>
                        {c.diagramType} · via {c.importTranslator}
                      </small>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {step === 3 ? (
            <div className="fab-form">
              <button type="button" className="btn tiny" onClick={() => setStep(2)}>
                ← {diagramType}
              </button>
              <p className="hint">
                Coupling <code>{modelingDomainId}</code> → <code>{diagramType}</code>
              </p>
              <label>
                Instance name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') finish();
                  }}
                />
              </label>
              {error ? <p className="fab-error">{error}</p> : null}
              <button type="button" className="btn primary" onClick={finish}>
                Create
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
