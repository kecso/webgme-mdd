import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.13.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.41 1.05.72 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.58-.22 1.13-.53 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"
      />
    </svg>
  );
}

function FunctionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.2 7.2 4.5 12l3.7 4.8-1.5 1.2L2.2 12l4.5-6 1.5 1.2zm7.6 0 1.5-1.2 4.5 6-4.5 6-1.5-1.2L19.5 12l-3.7-4.8zM13.6 4l-3.2 16h-1.7l3.2-16h1.7z"
      />
    </svg>
  );
}

function useMenuCloser(open, rootRef, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) onClose();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, rootRef, onClose]);
}

export default function Header({
  project,
  mode,
  active,
  onToggleSource,
  sourceOpen,
  onToggleInspector,
  inspectorOpen,
  onOpenSettings,
  onExportBook,
  onPlainExport,
  onCloseDiagram,
  onCloseProject,
  userLabel
}) {
  const [menu, setMenu] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const gearRef = useRef(null);
  const functionRef = useRef(null);

  const closeMenus = useCallback(() => {
    setMenu(null);
    setSettingsOpen(false);
  }, []);

  useMenuCloser(menu === 'gear', gearRef, closeMenus);
  useMenuCloser(menu === 'functions', functionRef, closeMenus);

  const run = (event, fn) => {
    event.stopPropagation();
    closeMenus();
    fn?.();
  };

  return (
    <header className="studio-header">
      <div className="brand-block">
        <nav className="crumbs" aria-label="Location">
          <Link to="/" className="brand" title="Markdown System Studio">
            MDSS
          </Link>
          {project ? (
            <>
              <span className="crumb-sep" aria-hidden>
                ›
              </span>
              <span className={`crumb${mode === 'overview' ? ' current' : ''}`}>
              <button
                type="button"
                className="crumb-label"
                title="Project"
                onClick={onCloseDiagram}
              >
                {project.owner}/{project.name}
                {project.storyId ? ` · ${project.storyId}` : ''}
              </button>
              <button
                type="button"
                className="crumb-close"
                aria-label="Close project"
                title="Close project"
                onClick={onCloseProject}
              >
                ×
              </button>
            </span>
            {mode === 'canvas' && active ? (
              <>
                <span className="crumb-sep" aria-hidden>
                  ›
                </span>
                <span className="crumb current">
                  <span className="crumb-label" title={active.diagramType}>
                    {active.name || active.diagramType}
                  </span>
                  <button
                    type="button"
                    className="crumb-close"
                    aria-label="Close diagram"
                    title="Close diagram"
                    onClick={onCloseDiagram}
                  >
                    ×
                  </button>
                </span>
              </>
            ) : null}
            </>
          ) : null}
        </nav>
      </div>
      <div className="header-actions">
        {project ? (
          <>
            <div className="header-menu" ref={gearRef}>
              <button
                type="button"
                className="header-settings"
                aria-label="Settings"
                aria-haspopup="menu"
                aria-expanded={menu === 'gear'}
                title="Settings"
                onClick={() => {
                  setMenu((current) => (current === 'gear' ? null : 'gear'));
                  setSettingsOpen(false);
                }}
              >
                <GearIcon />
              </button>
              {menu === 'gear' ? (
                <div className="header-menu-panel" role="menu" aria-label="Settings">
                  <button
                    type="button"
                    role="menuitem"
                    className="header-menu-item"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => run(event, onToggleSource)}
                  >
                    {sourceOpen ? 'Hide source' : 'Show source'}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="header-menu-item"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => run(event, onToggleInspector)}
                  >
                    {inspectorOpen ? 'Hide logs' : 'Show logs'}
                  </button>
                  <div className={`header-menu-branch${settingsOpen ? ' open' : ''}`}>
                    <button
                      type="button"
                      role="menuitem"
                      className="header-menu-item"
                      aria-expanded={settingsOpen}
                      onClick={() => setSettingsOpen((open) => !open)}
                    >
                      <span>Settings</span>
                      <span className="header-menu-chevron" aria-hidden>
                        ›
                      </span>
                    </button>
                    {settingsOpen ? (
                      <div className="header-submenu" role="menu" aria-label="Settings">
                        <button
                          type="button"
                          role="menuitem"
                          className="header-menu-item"
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => run(event, onOpenSettings)}
                        >
                          Domains
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="header-menu" ref={functionRef}>
              <button
                type="button"
                className="header-settings"
                aria-label="Functions"
                aria-haspopup="menu"
                aria-expanded={menu === 'functions'}
                title="Functions"
                onClick={() => {
                  setMenu((current) => (current === 'functions' ? null : 'functions'));
                  setSettingsOpen(false);
                }}
              >
                <FunctionIcon />
              </button>
              {menu === 'functions' ? (
                <div className="header-menu-panel" role="menu" aria-label="Functions">
                  <button
                    type="button"
                    role="menuitem"
                    className="header-menu-item"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => run(event, onPlainExport)}
                  >
                    Export project
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="header-menu-item"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => run(event, onExportBook)}
                  >
                    Export Markdown book
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
        <span className="user-chip">{userLabel || 'Local demo'}</span>
      </div>
    </header>
  );
}
