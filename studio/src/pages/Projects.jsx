import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createProject,
  dropProject,
  listProjects,
  resetS1DemoProject
} from '../data/projectDocument.js';
import { plainExportProject } from '../control/plainExport.js';
import { isDemoRuntime } from '../control/runtime.js';
import {
  S1_MODELING_DOMAINS,
  diagramLabel,
  diagramsForDomain,
  domainLabel
} from '../data/modelingDomains.js';

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1zM5 18a1 1 0 0 0 1 1h12a1 1 0 1 0 0-2H6a1 1 0 0 0-1 1z"
      />
    </svg>
  );
}

function DropIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 3h6a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2h-1.05l-.82 12.04A2 2 0 0 1 16.14 21H7.86a2 2 0 0 1-1.99-1.96L5.05 7H4a1 1 0 0 1 0-2h4V4a1 1 0 0 1 1-1zm0 4H7.07l.8 11.7.01.3h8.24l.81-12H9zm1 2.5a1 1 0 0 1 1 1V17a1 1 0 1 1-2 0v-6.5a1 1 0 0 1 1-1zm4 0a1 1 0 0 1 1 1V17a1 1 0 1 1-2 0v-6.5a1 1 0 0 1 1-1z"
      />
    </svg>
  );
}

function projectMeta(project) {
  const n = Object.keys(project.diagrams || {}).length;
  const diagrams = `${n} diagram${n === 1 ? '' : 's'}`;
  if (project.id === 'demo+s1-aeb') return `S1 demo · ${diagrams}`;
  if (project.profile === 'domain' && project.profileDomain) {
    return `${domainLabel(project.profileDomain)} · ${diagrams}`;
  }
  if (project.profile === 'empty') return `Empty · ${diagrams}`;
  return diagrams;
}

export default function Projects() {
  const demo = isDemoRuntime();
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState(demo ? 'my-mdd' : 'my_mdd');
  const [profileChoice, setProfileChoice] = useState('empty');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const refresh = () => {
    listProjects()
      .then(setProjects)
      .catch((err) => setNotice(err && err.message ? err.message : 'Could not list projects'));
  };

  useEffect(() => {
    refresh();
  }, []);

  const allowed =
    profileChoice === 'empty' ? [] : diagramsForDomain(profileChoice);

  const exportOne = async (project) => {
    setNotice('');
    setBusyId(project.id);
    try {
      const result = await plainExportProject(project);
      setNotice(`Exported ${result.fileName}`);
    } catch (err) {
      setNotice(err && err.message ? err.message : 'Export failed');
    } finally {
      setBusyId(null);
    }
  };

  const dropOne = async (project) => {
    const label = project.title || project.name;
    if (!window.confirm(`Drop ${label}? This removes it from the project list.`)) return;
    try {
      await dropProject(project.id);
      setProjects(await listProjects());
      setNotice(`Dropped ${label}`);
    } catch (err) {
      setNotice(err && err.message ? err.message : 'Could not drop the project');
    }
  };

  return (
    <div className="page projects">
      <header className="page-head">
        <h1>Projects</h1>
        <Link to="/" className="btn">
          Welcome
        </Link>
      </header>

      <section className="panel">
        <h2>Open</h2>
        <ul className="project-list">
          {projects.map((p) => (
            <li key={p.id}>
              <div className="project-main">
                <Link to={`/p/${p.owner}/${p.name}`}>{p.title || p.name}</Link>
                <span className="muted">{projectMeta(p)}</span>
              </div>
              <span className="project-actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Export ${p.title || p.name}`}
                  title="Export project"
                  disabled={busyId === p.id}
                  onClick={() => exportOne(p)}
                >
                  <ExportIcon />
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label={`Drop ${p.title || p.name}`}
                  title="Drop project"
                  onClick={() => dropOne(p)}
                >
                  <DropIcon />
                </button>
              </span>
            </li>
          ))}
        </ul>
        {notice ? <p className="hint">{notice}</p> : null}
        {demo ? (
          <p className="hint" style={{ marginTop: '0.85rem' }}>
            <button
              type="button"
              className="btn tiny"
              onClick={() => {
                resetS1DemoProject();
                refresh();
              }}
            >
              Reset S1 demo
            </button>
          </p>
        ) : null}
      </section>

      <section className="panel">
        <h2>Create</h2>
        <form
          className="create-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const empty = profileChoice === 'empty';
            const spec = {
              name: demo ? name.trim().replace(/[^\w-]+/g, '-') || 'project' : name.trim(),
              profile: empty ? 'empty' : 'domain',
              profileDomain: empty ? null : profileChoice,
              allowedDiagramTypes: empty ? [] : diagramsForDomain(profileChoice)
            };
            setCreating(true);
            setNotice('');
            try {
              const project = await createProject(spec);
              navigate(`/p/${project.owner}/${project.name}`);
            } catch (err) {
              setNotice(err && err.message ? err.message : 'Could not create the project');
              setCreating(false);
            }
          }}
        >
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Domain
            <select
              value={profileChoice}
              onChange={(e) => setProfileChoice(e.target.value)}
            >
              <option value="empty">Empty</option>
              {S1_MODELING_DOMAINS.map((id) => (
                <option key={id} value={id}>
                  {domainLabel(id)}
                </option>
              ))}
            </select>
          </label>
          <p className="hint">
            {demo
              ? 'Saved in this browser only.'
              : 'Saved as a WebGME project. The name uses letters, digits, and underscores.'}
            {profileChoice === 'empty'
              ? ' No diagrams yet. Add the ones this project needs after it is created.'
              : ` Allows ${allowed.map(diagramLabel).join(', ')}. You can add other S1 diagrams later.`}
          </p>
          <button type="submit" className="btn primary" disabled={creating}>
            {creating ? 'Creating…' : 'Create project'}
          </button>
        </form>
      </section>
    </div>
  );
}
