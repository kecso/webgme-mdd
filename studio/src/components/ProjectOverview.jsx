import React, { useMemo } from 'react';
import { domainLabel } from '../data/modelingDomains.js';

/**
 * Project overview — lists project elements (diagram instances) grouped by
 * modeling domain. This is a project aspect, not a permanent side rail of
 * every possible diagram type.
 */
export default function ProjectOverview({
  project,
  catalog,
  activeKey,
  onOpenDiagram
}) {
  const groups = useMemo(() => {
    const enabled = project.enabledModelingDomains || [];
    const byDomain = new Map();
    enabled.forEach((id) => byDomain.set(id, []));

    Object.entries(project.diagrams || {}).forEach(([key, inst]) => {
      const md =
        inst.modelingDomainId ||
        enabled.find((id) => (catalog?.domainIndex?.[id] || []).includes(inst.diagramType)) ||
        '_unassigned';
      if (!byDomain.has(md)) byDomain.set(md, []);
      byDomain.get(md).push({ key, ...inst });
    });

    return [...byDomain.entries()].map(([modelingDomainId, items]) => ({
      modelingDomainId,
      name:
        modelingDomainId === '_unassigned'
          ? 'Unassigned'
          : domainLabel(modelingDomainId),
      diagramTypes: catalog?.domainIndex?.[modelingDomainId] || [],
      items: items.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }));
  }, [project, catalog]);

  const total = Object.keys(project.diagrams || {}).length;
  const corrCount = (project.correspondences || []).length;

  const enabledCount = (project.enabledModelingDomains || []).length;
  const allowedViews = useMemo(() => {
    const set = new Set();
    (project.enabledModelingDomains || []).forEach((id) => {
      (catalog?.domainIndex?.[id] || []).forEach((t) => set.add(t));
    });
    return [...set].sort();
  }, [project.enabledModelingDomains, catalog]);

  return (
    <div className="project-overview">
      <header className="overview-head">
        <div>
          <p className="eyebrow">Project overview</p>
          <h2>{project.title || project.name}</h2>
          <p className="hint">
            Elements grouped by <strong>modeling domain</strong>. Use <strong>Domains</strong> to
            enable concerns for this project — that set drives which views the{' '}
            <strong>+</strong> control can create. Several domains may share a view language
            (e.g. flowchart).
          </p>
        </div>
      </header>

      <div className="overview-stats">
        <span>{enabledCount} domains enabled</span>
        <span>{total} diagram{total === 1 ? '' : 's'}</span>
        {corrCount ? (
          <span>{corrCount} correspondence{corrCount === 1 ? '' : 's'}</span>
        ) : null}
        {project.storyId ? <span>Story {project.storyId}</span> : null}
        {project.seedVersion ? <span>seed v{project.seedVersion}</span> : null}
      </div>

      {enabledCount === 0 ? (
        <p className="hint overview-gate">
          No modeling domains enabled — open <strong>Domains</strong> before creating diagrams.
        </p>
      ) : (
        <p className="hint overview-gate">
          Creatable views from enabled domains:{' '}
          <code>{allowedViews.length ? allowedViews.join(', ') : 'none'}</code>
        </p>
      )}

      <div className="overview-groups">
        {groups.map((g) => (
          <section key={g.modelingDomainId} className="overview-group">
            <header>
              <h3>{g.name}</h3>
              {g.diagramTypes.length ? (
                <p className="hint">
                  Views: {g.diagramTypes.join(', ')}
                </p>
              ) : null}
            </header>
            {g.items.length === 0 ? (
              <p className="empty">No diagrams yet in this domain.</p>
            ) : (
              <ul className="overview-list">
                {g.items.map((inst) => (
                  <li key={inst.key}>
                    <button
                      type="button"
                      className={activeKey === inst.key ? 'active' : ''}
                      onClick={() => onOpenDiagram(inst.key)}
                    >
                      <span className="ov-name">{inst.name || inst.key}</span>
                      <span className="ov-type">{inst.diagramType}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
