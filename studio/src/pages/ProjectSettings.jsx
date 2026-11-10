import React, { useMemo, useState } from 'react';
import { setEnabledDomains } from '../data/demoStore.js';

/**
 * Domain enablement dialog — DSS DomainSelector analogue.
 */
export default function ProjectSettings({ project, catalog, open, onClose, onSaved }) {
  const all = useMemo(() => {
    const diagrams = catalog?.diagrams || [];
    const companions = catalog?.companionLanguages || [];
    return [...diagrams, ...companions];
  }, [catalog]);

  const [selected, setSelected] = useState(() => new Set(project.enabledDomains));

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-label="Enabled MDD domains"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>Enabled domains</h2>
          <p className="hint">
            Only these packages appear in the browser. TODO: DomainManager syncs WebGME
            libraries (<code>MDD:…</code> kind).
          </p>
        </header>
        <div className="domain-grid">
          {all.map((d) => (
            <label key={d.id} className="check">
              <input
                type="checkbox"
                checked={selected.has(d.id)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(d.id);
                  else next.delete(d.id);
                  setSelected(next);
                }}
              />
              <span>
                {d.name}
                <small>{d.id}{d.notMermaid ? ' · companion' : ''}</small>
              </span>
            </label>
          ))}
        </div>
        <footer>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              const domains = [...selected];
              setEnabledDomains(project.id, domains);
              onSaved(domains);
              onClose();
            }}
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}
