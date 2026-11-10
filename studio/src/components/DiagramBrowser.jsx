import React from 'react';

/**
 * Left rail — diagram instances filtered by enabled domains.
 */
export default function DiagramBrowser({
  domains,
  enabledDomains,
  diagrams,
  activeKey,
  onSelect,
  onCreate
}) {
  const enabled = domains.filter((d) => enabledDomains.includes(d.id));

  return (
    <nav className="diagram-browser">
      <div className="rail-title">Diagrams</div>
      <ul className="domain-list">
        {enabled.map((d) => {
          const instances = Object.entries(diagrams).filter(
            ([, v]) => v.domainId === d.id
          );
          return (
            <li key={d.id}>
              <div className="domain-row">
                <span>{d.name}</span>
                <button
                  type="button"
                  className="btn tiny"
                  onClick={() => onCreate(d.id)}
                  title={`New ${d.id} diagram`}
                >
                  +
                </button>
              </div>
              <ul>
                {instances.length === 0 ? (
                  <li className="empty">none yet</li>
                ) : (
                  instances.map(([key, inst]) => (
                    <li key={key}>
                      <button
                        type="button"
                        className={activeKey === key ? 'active' : ''}
                        onClick={() => onSelect(key)}
                      >
                        {inst.name || key}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </li>
          );
        })}
      </ul>
      {/* TODO(webgme): territory tree from Core containment; library META filter */}
    </nav>
  );
}
