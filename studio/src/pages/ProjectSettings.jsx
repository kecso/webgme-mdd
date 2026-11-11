import React, { useEffect, useState } from 'react';
import { setAllowedDiagramTypes } from '../data/demoStore.js';
import {
  S1_DIAGRAM_TYPES,
  diagramLabel,
  diagramsForDomain,
  domainLabel
} from '../data/modelingDomains.js';

/**
 * Allowed diagram types for this project.
 * A chosen domain starts with its diagrams checked. Empty starts with none.
 */
export default function ProjectSettings({ project, open, onClose, onSaved }) {
  const [selected, setSelected] = useState(
    () => new Set(project.allowedDiagramTypes || [])
  );

  useEffect(() => {
    if (open) setSelected(new Set(project.allowedDiagramTypes || []));
  }, [open, project.allowedDiagramTypes]);

  if (!open) return null;

  const domainDefaults =
    project.profile === 'domain' && project.profileDomain
      ? diagramsForDomain(project.profileDomain)
      : [];

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-label="Domains"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>Domains</h2>
          {project.profile === 'empty' ? (
            <p className="hint">
              This project started empty. Check the diagrams it should be allowed to use.
            </p>
          ) : null}
          {project.profile === 'domain' && project.profileDomain ? (
            <p className="hint">
              Started from <strong>{domainLabel(project.profileDomain)}</strong>. Its
              diagrams are allowed by default
              {domainDefaults.length ? `: ${domainDefaults.map(diagramLabel).join(', ')}` : ''}.
              Add or remove diagrams for this project.
            </p>
          ) : null}
          {project.profile === 'story' ? (
            <p className="hint">
              S1 demo. These are the diagram types you can create more of.
            </p>
          ) : null}
        </header>
        <div className="domain-grid">
          {S1_DIAGRAM_TYPES.map((id) => (
            <label key={id} className="check">
              <input
                type="checkbox"
                checked={selected.has(id)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(id);
                  else next.delete(id);
                  setSelected(next);
                }}
              />
              <span>
                {diagramLabel(id)}
                <small>{id}</small>
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
              const types = S1_DIAGRAM_TYPES.filter((id) => selected.has(id));
              setAllowedDiagramTypes(project.id, types);
              onSaved(types);
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
