import React from 'react';
import { Link } from 'react-router-dom';

export default function Header({
  project,
  onToggleSource,
  sourceOpen,
  onOpenSettings,
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
      </div>
      <div className="header-actions">
        {project ? (
          <>
            <button type="button" className="btn" onClick={onToggleSource}>
              {sourceOpen ? 'Hide source' : 'Show source'}
            </button>
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
