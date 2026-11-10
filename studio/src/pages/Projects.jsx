import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createProject,
  listProjects,
  resetS1DemoProject,
  S1_MODELING_DOMAINS
} from '../data/demoStore.js';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('my-mdd');
  const navigate = useNavigate();

  useEffect(() => {
    setProjects(listProjects());
  }, []);

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
              <span className="muted">
                {Object.keys(p.diagrams || {}).length} diagrams ·{' '}
                {(p.enabledModelingDomains || []).length} domains
              </span>
            </li>
          ))}
        </ul>
        <p className="hint" style={{ marginTop: '0.85rem' }}>
          S1 demo ships with story-shaped Mermaid/EARS fixtures (no WebGME seeds).{' '}
          <button
            type="button"
            className="btn tiny"
            onClick={() => {
              resetS1DemoProject();
              setProjects(listProjects());
            }}
          >
            Reset S1 seed
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
            const p = createProject({
              name: safe,
              enabledModelingDomains: [...S1_MODELING_DOMAINS]
            });
            // TODO(webgme): DomainManager.createProject with modeling-domain kind
            navigate(`/p/${p.owner}/${p.name}`);
          }}
        >
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <p className="hint">
            Seeds with S1 <strong>modeling domains</strong> (editable in Domains). Diagram
            types are chosen later via domain→view couplings.
          </p>
          <button type="submit" className="btn primary">
            Create project
          </button>
        </form>
      </section>
    </div>
  );
}
