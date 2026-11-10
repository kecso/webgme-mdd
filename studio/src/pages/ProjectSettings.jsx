import React, { useEffect, useMemo, useState } from 'react';
import { setEnabledModelingDomains } from '../data/demoStore.js';
import { listModelingDomains } from '../data/modelingDomains.js';

/**
 * Enable modeling domains for the project.
 * The enabled set is the sole driver of which diagram views + can create.
 */
export default function ProjectSettings({ project, catalog, open, onClose, onSaved }) {
  const all = useMemo(() => listModelingDomains(catalog), [catalog]);
  const [selected, setSelected] = useState(
    () => new Set(project.enabledModelingDomains || [])
  );
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (open) {
      setSelected(new Set(project.enabledModelingDomains || []));
      setFilter('');
    }
  }, [open, project.enabledModelingDomains]);

  const previewViews = useMemo(() => {
    const set = new Set();
    selected.forEach((id) => {
      const entry = all.find((d) => d.id === id);
      (entry?.diagramTypes || []).forEach((t) => set.add(t));
    });
    return [...set].sort();
  }, [selected, all]);

  if (!open) return null;

  const q = filter.trim().toLowerCase();
  const visible = q
    ? all.filter(
        (d) =>
          d.id.includes(q) ||
          d.name.toLowerCase().includes(q) ||
          d.diagramTypes.some((t) => t.includes(q))
      )
    : all;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-label="Enabled modeling domains"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>Modeling domains</h2>
          <p className="hint">
            Enable modeling domains for this project. Only those domains appear in{' '}
            <strong>+</strong>, and only their coupled view languages can be created
            (e.g. enable <code>ci-cd</code> to allow flowchart under that domain).
          </p>
          <input
            className="filter-input"
            placeholder="Filter domains or diagram types…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <p className="hint domain-preview">
            Creatable views with current selection:{' '}
            <code>{previewViews.length ? previewViews.join(', ') : 'none'}</code>
          </p>
        </header>
        <div className="domain-grid">
          {visible.map((d) => (
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
                <small>
                  {d.id}
                  {d.diagramTypes.length ? ` · views: ${d.diagramTypes.join(', ')}` : ''}
                </small>
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
              setEnabledModelingDomains(project.id, domains);
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
