import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProject, listProjects, S1_DOMAINS } from '../data/demoStore.js';

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
              <span className="muted">{p.enabledDomains.length} domains</span>
            </li>
          ))}
        </ul>
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
              enabledDomains: [...S1_DOMAINS]
            });
            // TODO(webgme): DomainManager.createProject + seed libraries
            navigate(`/p/${p.owner}/${p.name}`);
          }}
        >
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <p className="hint">Seeds with S1 domain set (editable in project Domains).</p>
          <button type="submit" className="btn primary">
            Create project
          </button>
        </form>
      </section>
    </div>
  );
}
