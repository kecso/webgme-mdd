import React, { useEffect, useState } from 'react';
import { diagramLabel } from '../data/modelingDomains.js';

/**
 * Create control: pick an allowed diagram type, then name the instance.
 */
export default function NewDiagramFab({
  open,
  onOpen,
  onClose,
  allowedDiagramTypes,
  onCreate,
  onOpenDiagrams
}) {
  const [step, setStep] = useState(1);
  const [diagramType, setDiagramType] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setStep(1);
      setDiagramType(null);
      setName('');
      setError('');
    }
  }, [open]);

  const types = allowedDiagramTypes || [];

  const finish = () => {
    setError('');
    if (!diagramType || !types.includes(diagramType)) {
      setError('Pick a diagram this project is allowed to use.');
      return;
    }
    const safe = (name.trim() || `${diagramType}-1`).replace(/[^\w.-]+/g, '-') || diagramType;
    onCreate({ diagramType, name: safe });
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
              <strong>{step === 1 ? 'Choose diagram' : 'Name instance'}</strong>
            </div>
            <button type="button" className="btn tiny" onClick={onClose}>
              ✕
            </button>
          </header>

          <div className="fab-steps" aria-hidden>
            <span className={step >= 1 ? 'on' : ''} />
            <span className={step >= 2 ? 'on' : ''} />
          </div>

          {step === 1 ? (
            <ul className="fab-list">
              {types.length === 0 ? (
                <li className="empty">
                  No diagrams allowed yet.
                  {onOpenDiagrams ? (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="btn tiny"
                        onClick={() => {
                          onClose();
                          onOpenDiagrams();
                        }}
                      >
                        Add diagrams
                      </button>
                    </>
                  ) : null}
                </li>
              ) : (
                types.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDiagramType(id);
                        setName(`${id}-1`);
                        setStep(2);
                      }}
                    >
                      <span>{diagramLabel(id)}</span>
                      <small>{id}</small>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}

          {step === 2 ? (
            <div className="fab-form">
              <button type="button" className="btn tiny" onClick={() => setStep(1)}>
                ← {diagramLabel(diagramType)}
              </button>
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
