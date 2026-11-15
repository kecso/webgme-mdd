import React, { useEffect, useRef, useState } from 'react';
import { diagramLabel } from '../data/modelingDomains.js';
import { detectDiagramSource, nameFromFile } from '../control/detectDiagramSource.js';

/**
 * Add control. New diagram picks an allowed type, then a name.
 * Import reads a file, checks that its diagram is allowed, then asks for a name.
 */
export default function NewDiagramFab({
  open,
  onOpen,
  onClose,
  allowedDiagramTypes,
  onCreate,
  onOpenDiagrams
}) {
  const [tab, setTab] = useState('new');
  const [step, setStep] = useState(1);
  const [diagramType, setDiagramType] = useState(null);
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [fileLabel, setFileLabel] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setTab('new');
      setStep(1);
      setDiagramType(null);
      setName('');
      setSource('');
      setFileLabel('');
      setError('');
      setDragOver(false);
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
    onCreate({
      diagramType,
      name: safe,
      source: tab === 'import' ? source : undefined
    });
    onClose();
  };

  const rejectImport = (message) => {
    setDiagramType(null);
    setSource('');
    setFileLabel('');
    setStep(1);
    setError(message);
  };

  const acceptText = (text, fileName) => {
    const found = detectDiagramSource(text, fileName);
    if (!found.type) {
      rejectImport(
        found.reason === 'empty'
          ? 'That file is empty.'
          : 'Could not tell what diagram this is. It needs a Mermaid header, such as flowchart or sequenceDiagram, or EARS requirements.'
      );
      return;
    }
    if (!types.includes(found.type)) {
      rejectImport(
        `${diagramLabel(found.type)} is not allowed on this project yet. Add it under Domains before importing.`
      );
      return;
    }
    setError('');
    setDiagramType(found.type);
    setSource(found.source);
    setFileLabel(fileName || 'Pasted source');
    setName(nameFromFile(fileName, found.type));
    setStep(2);
  };

  const takeFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      acceptText(text, file.name);
    } catch (err) {
      rejectImport(err && err.message ? err.message : 'Could not read that file.');
    }
  };

  const switchTab = (next) => {
    setTab(next);
    setStep(1);
    setDiagramType(null);
    setName('');
    setSource('');
    setFileLabel('');
    setError('');
  };

  return (
    <div className="fab-root">
      {!open ? (
        <button
          type="button"
          className="fab"
          title="Add diagram"
          aria-label="Add diagram"
          onClick={onOpen}
        >
          +
        </button>
      ) : (
        <div className="fab-panel" role="dialog" aria-label="Add diagram">
          <header className="fab-head">
            <div>
              <p className="eyebrow">{tab === 'import' ? 'Import diagram' : 'New diagram'}</p>
              <strong>
                {step === 2
                  ? tab === 'import' && diagramType
                    ? diagramLabel(diagramType)
                    : 'Name instance'
                  : tab === 'import'
                    ? 'Choose a file'
                    : 'Choose diagram'}
              </strong>
            </div>
            <button type="button" className="btn tiny" onClick={onClose}>
              ✕
            </button>
          </header>

          <div className="fab-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'new'}
              className={tab === 'new' ? 'on' : ''}
              onClick={() => switchTab('new')}
            >
              New diagram
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'import'}
              className={tab === 'import' ? 'on' : ''}
              onClick={() => switchTab('import')}
            >
              Import diagram
            </button>
          </div>

          {tab === 'new' && step === 1 ? (
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
                        setError('');
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

          {tab === 'import' && step === 1 ? (
            <div className="fab-form">
              <div
                className={dragOver ? 'drop-zone over' : 'drop-zone'}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  const file = event.dataTransfer.files && event.dataTransfer.files[0];
                  if (file) {
                    takeFile(file);
                    return;
                  }
                  const text = event.dataTransfer.getData('text/plain');
                  if (text) acceptText(text, '');
                }}
              >
                <p>Drop a diagram file here</p>
                <button type="button" className="btn tiny" onClick={() => fileRef.current?.click()}>
                  Choose file
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".mmd,.mermaid,.md,.markdown,.ears,.txt,text/plain"
                  onChange={(event) => {
                    const file = event.target.files && event.target.files[0];
                    takeFile(file);
                    event.target.value = '';
                  }}
                />
              </div>
              <label>
                Or paste source
                <textarea
                  rows={4}
                  placeholder="flowchart TD&#10;  A --> B"
                  onPaste={(event) => {
                    const text = event.clipboardData.getData('text/plain');
                    if (!text) return;
                    event.preventDefault();
                    acceptText(text, '');
                  }}
                />
              </label>
              {error ? (
                <p className="fab-error" role="alert">
                  {error}
                </p>
              ) : null}
              {error && onOpenDiagrams && diagramType == null && /not allowed/.test(error) ? (
                <button
                  type="button"
                  className="btn tiny"
                  onClick={() => {
                    onClose();
                    onOpenDiagrams();
                  }}
                >
                  Open Domains
                </button>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="fab-form">
              <button
                type="button"
                className="btn tiny"
                onClick={() => {
                  setStep(1);
                  setError('');
                }}
              >
                ← {diagramLabel(diagramType)}
                {tab === 'import' && fileLabel ? ` · ${fileLabel}` : ''}
              </button>
              {tab === 'import' ? (
                <p className="hint">Importing a {diagramLabel(diagramType)} diagram.</p>
              ) : null}
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
                {tab === 'import' ? 'Import' : 'Create'}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
