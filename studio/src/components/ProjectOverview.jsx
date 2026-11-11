import React, { useMemo } from 'react';
import { diagramLabel, domainLabel } from '../data/modelingDomains.js';
import { integrationView } from '../data/s1Integrating.js';

/**
 * Project overview. The S1 demo groups existing diagrams by the domain that
 * owns each one. A new project is one domain, or empty, and lists its diagrams
 * in a single group.
 */
export default function ProjectOverview({
  project,
  catalog,
  activeKey,
  onOpenDiagram
}) {
  const groups = useMemo(() => {
    const itemsOf = (list) =>
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const all = Object.entries(project.diagrams || {}).map(([key, inst]) => ({
      key,
      ...inst
    }));

    if (project.profile === 'domain' || project.profile === 'empty') {
      if (project.profile === 'empty' && all.length === 0) return [];
      return [
        {
          modelingDomainId: project.profileDomain || '_diagrams',
          name:
            project.profile === 'domain'
              ? domainLabel(project.profileDomain)
              : 'Diagrams',
          diagramTypes: project.allowedDiagramTypes || [],
          items: itemsOf(all)
        }
      ];
    }

    const byDomain = new Map();
    all.forEach((inst) => {
      const md =
        inst.modelingDomainId ||
        (project.enabledModelingDomains || []).find((id) =>
          (catalog?.domainIndex?.[id] || []).includes(inst.diagramType)
        ) ||
        '_unassigned';
      if (!byDomain.has(md)) byDomain.set(md, []);
      byDomain.get(md).push(inst);
    });

    return [...byDomain.entries()].map(([modelingDomainId, items]) => ({
      modelingDomainId,
      name:
        modelingDomainId === '_unassigned' ? 'Unassigned' : domainLabel(modelingDomainId),
      diagramTypes: [],
      items: itemsOf(items)
    }));
  }, [project, catalog]);

  const total = Object.keys(project.diagrams || {}).length;
  const allowed = project.allowedDiagramTypes || [];
  const connections = integrationView(project.integrating);

  let lead = 'S1 demo.';
  if (project.profile === 'domain' && project.profileDomain) {
    lead = `${domainLabel(project.profileDomain)}. Allowed: ${
      allowed.length ? allowed.map(diagramLabel).join(', ') : 'none'
    }.`;
  } else if (project.profile === 'empty') {
    lead = allowed.length
      ? `Empty project. Allowed: ${allowed.map(diagramLabel).join(', ')}.`
      : 'Empty project. Open Diagrams and add the ones you need, then use +.';
  }

  return (
    <div className="project-overview">
      <header className="overview-head">
        <div>
          <p className="eyebrow">Project overview</p>
          <h2>{project.title || project.name}</h2>
          <p className="hint">{lead}</p>
        </div>
      </header>

      <div className="overview-stats">
        <span>
          {total} diagram{total === 1 ? '' : 's'}
        </span>
        {project.id === 'demo+s1-aeb' ? <span>S1 demo</span> : null}
        {connections ? (
          <span>
            {connections.uses.length} connections
            {connections.open.length ? ` · ${connections.open.length} open` : ''}
          </span>
        ) : null}
      </div>

      {connections ? (
        <details className="connections">
          <summary>
            How these diagrams connect
            {connections.open.length
              ? ` — ${connections.open.length} open`
              : ''}
          </summary>
          <p className="hint">
            Same portion of the system is one element that shows up on several diagrams.
            A connection says how one element uses another. The diagrams keep one shared
            taxonomy.
          </p>
          {connections.open.length ? (
            <>
              <h3>Open</h3>
              <ul className="conn-list">
                {connections.open.map((c) => (
                  <li key={c.id}>
                    <span className="status-open">open</span>{' '}
                    <code className="conn-rule">{c.ruleId}</code>
                    <div>{c.summary}</div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <h3>Same element, several diagrams</h3>
          <ul className="conn-list">
            {connections.identities.map((item) => (
              <li key={item.name}>
                <strong>{item.name}</strong>
                <div className="hint">{item.places.join(' · ')}</div>
              </li>
            ))}
          </ul>
          <h3>How one element uses another</h3>
          <ul className="conn-list">
            {connections.uses.map((link) => (
              <li key={link.id}>
                {link.left} <em>{link.kind}</em> {link.right}
                <div>
                  <code className="conn-rule">{link.ruleId}</code>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="overview-groups">
        {groups.map((g) => (
          <section key={g.modelingDomainId} className="overview-group">
            <header>
              <h3>{g.name}</h3>
              {project.profile !== 'story' && g.diagramTypes.length ? (
                <p className="hint">Allowed: {g.diagramTypes.map(diagramLabel).join(', ')}</p>
              ) : null}
            </header>
            {g.items.length === 0 ? (
              <p className="empty">No diagrams yet. Use + to add one.</p>
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
