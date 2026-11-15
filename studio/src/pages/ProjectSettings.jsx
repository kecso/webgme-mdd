import React, { useEffect, useMemo, useState } from 'react';
import {
  S1_DIAGRAM_TYPES,
  S1_MODELING_DOMAINS,
  diagramLabel,
  diagramsForDomain,
  domainLabel
} from '../data/modelingDomains.js';

/**
 * Add domains and diagram languages. Items already on the project stay checked
 * and cannot be cleared. Confirming mounts each new diagram seed as a library
 * on the WebGME host.
 */
export default function ProjectSettings({ project, open, onClose, onSaved, libraryHost = false }) {
  const lockedDomains = useMemo(() => {
    const ids = new Set(project.enabledModelingDomains || []);
    if (project.profileDomain) ids.add(project.profileDomain);
    return ids;
  }, [project.enabledModelingDomains, project.profileDomain]);

  const lockedDiagrams = useMemo(
    () => new Set(project.allowedDiagramTypes || []),
    [project.allowedDiagramTypes]
  );

  const [pickedDomains, setPickedDomains] = useState(() => new Set(lockedDomains));
  const [extraDiagrams, setExtraDiagrams] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setPickedDomains(new Set(lockedDomains));
    setExtraDiagrams(new Set());
    setBusy(false);
    setError('');
  }, [open, lockedDomains, lockedDiagrams]);

  const selectedDiagrams = useMemo(() => {
    const next = new Set(lockedDiagrams);
    pickedDomains.forEach((domain) => {
      diagramsForDomain(domain).forEach((id) => next.add(id));
    });
    extraDiagrams.forEach((id) => next.add(id));
    return next;
  }, [lockedDiagrams, pickedDomains, extraDiagrams]);

  if (!open) return null;

  const addedDomains = [...pickedDomains].filter((id) => !lockedDomains.has(id));
  const addedDiagrams = [...selectedDiagrams].filter((id) => !lockedDiagrams.has(id));
  const pending = addedDomains.length + addedDiagrams.length;

  const toggleDomain = (id) => {
    if (lockedDomains.has(id)) return;
    setPickedDomains((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDiagram = (id) => {
    if (lockedDiagrams.has(id)) return;
    const fromDomain = [...pickedDomains].some((domain) => diagramsForDomain(domain).includes(id));
    if (fromDomain) return;
    setExtraDiagrams((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSaved({
        diagramTypes: [...selectedDiagrams],
        domains: [...pickedDomains]
      });
      onClose();
    } catch (err) {
      setError(err && err.message ? err.message : 'Could not add the languages');
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={busy ? undefined : onClose}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-label="Domains"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>Domains</h2>
          <p className="hint">
            Languages already on this project stay.
            {libraryHost
              ? ' Check a domain or a diagram, then confirm to mount each new seed as a library.'
              : ' Check a domain or a diagram to allow it in this demo.'}
          </p>
        </header>
        <h3>Domains</h3>
        <div className="domain-grid">
          {S1_MODELING_DOMAINS.map((id) => {
            const locked = lockedDomains.has(id);
            const checked = pickedDomains.has(id);
            return (
              <label key={id} className={locked ? 'check is-locked' : 'check'}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={locked}
                  onChange={() => toggleDomain(id)}
                />
                <span>
                  {domainLabel(id)}
                  <small>{diagramsForDomain(id).map(diagramLabel).join(', ')}</small>
                </span>
              </label>
            );
          })}
        </div>
        <h3>Diagrams</h3>
        <div className="domain-grid">
          {S1_DIAGRAM_TYPES.map((id) => {
            const fromDomain = [...pickedDomains].some((domain) =>
              diagramsForDomain(domain).includes(id)
            );
            const locked = lockedDiagrams.has(id) || fromDomain;
            const checked = selectedDiagrams.has(id);
            return (
              <label key={id} className={lockedDiagrams.has(id) ? 'check is-locked' : 'check'}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={locked}
                  onChange={() => toggleDiagram(id)}
                />
                <span>
                  {diagramLabel(id)}
                  <small>{id}</small>
                </span>
              </label>
            );
          })}
        </div>
        {error ? <p className="hint">{error}</p> : null}
        <footer>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={busy || pending === 0}
            onClick={confirm}
          >
            {busy ? 'Adding…' : 'Add'}
          </button>
        </footer>
      </div>
    </div>
  );
}
