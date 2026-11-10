import React from 'react';
import { Link } from 'react-router-dom';
import { domainLabel } from '../data/modelingDomains.js';

export default function Header({
  project,
  mode,
  active,
  onToggleSource,
  sourceOpen,
  onOpenSettings,
  onShowOverview,
  onShowCanvas,
  onExportBook,
  userLabel
}) {
  return (
    <header className="studio-header">
      <div className="brand-block">
        <Link to="/" className="brand" title="Markdown System Studio">
          MDSS
        </Link>
        {project ? (
          <span className="project-chip">
            {project.owner}/{project.name}
            {project.storyId ? ` · ${project.storyId}` : ''}
          </span>
        ) : null}
        {project ? (
          <nav className="mode-tabs" aria-label="Project aspects">
            <button
              type="button"
              className={mode === 'overview' ? 'active' : ''}
              onClick={onShowOverview}
            >
              Overview
            </button>
            <button
              type="button"
              className={mode === 'canvas' ? 'active' : ''}
              disabled={!active}
              title={active ? active.name : 'Open a diagram from overview'}
              onClick={() => active && onShowCanvas?.()}
            >
              {active
                ? `${active.diagramType}${
                    active.modelingDomainId
                      ? ` · ${domainLabel(active.modelingDomainId)}`
                      : ''
                  }`
                : 'Diagram'}
            </button>
          </nav>
        ) : null}
      </div>
      <div className="header-actions">
        {project && mode === 'canvas' ? (
          <button type="button" className="btn" onClick={onToggleSource}>
            {sourceOpen ? 'Hide source' : 'Show source'}
          </button>
        ) : null}
        {project ? (
          <>
            <button type="button" className="btn" onClick={onOpenSettings}>
              Domains
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={onExportBook}
              title="Open browsable Markdown book for this project"
            >
              Export book
            </button>
          </>
        ) : null}
        <span className="user-chip">{userLabel || 'Local demo'}</span>
      </div>
    </header>
  );
}
