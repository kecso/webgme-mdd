import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProject, listProjects, resetS1DemoProject } from '../data/demoStore.js';
import {
  S1_MODELING_DOMAINS,
  diagramLabel,
  diagramsForDomain,
  domainLabel
} from '../data/modelingDomains.js';

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
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('my-mdd');
  const [profileChoice, setProfileChoice] = useState('empty');
  const navigate = useNavigate();

  useEffect(() => {
    setProjects(listProjects());
  }, []);

  const allowed =
    profileChoice === 'empty' ? [] : diagramsForDomain(profileChoice);

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
              <Link to={`/p/${p.owner}/${p.name}`}>{p.title || p.name}</Link>
              <span className="muted">{projectMeta(p)}</span>
            </li>
          ))}
        </ul>
        <p className="hint" style={{ marginTop: '0.85rem' }}>
          <button
            type="button"
            className="btn tiny"
            onClick={() => {
              resetS1DemoProject();
              setProjects(listProjects());
            }}
          >
            Reset S1 demo
          </button>
        </p>
      </section>

      <section className="panel">
        <h2>Create</h2>
        <form
          className="create-form"
          onSubmit={(e) => {
            e.preventDefault();
            const safe = name.trim().replace(/[^\w-]+/g, '-') || 'project';
            const empty = profileChoice === 'empty';
            const p = createProject({
              name: safe,
              profile: empty ? 'empty' : 'domain',
              profileDomain: empty ? null : profileChoice,
              allowedDiagramTypes: empty ? [] : diagramsForDomain(profileChoice)
            });
            navigate(`/p/${p.owner}/${p.name}`);
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
            {profileChoice === 'empty'
              ? 'No diagrams yet. Add the ones this project needs after it is created.'
              : `Allows ${allowed.map(diagramLabel).join(', ')}. You can add other S1 diagrams later.`}
          </p>
          <button type="submit" className="btn primary">
            Create project
          </button>
        </form>
      </section>
    </div>
  );
}
