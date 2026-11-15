import React from 'react';
import { Link } from 'react-router-dom';
import { isDemoRuntime } from '../control/runtime.js';

export default function Welcome() {
  const demo = isDemoRuntime();
  return (
    <div className="page welcome">
      <div className="welcome-hero">
        <p className="eyebrow">{demo ? 'Local demo · S1' : 'WebGME · S1'}</p>
        <h1>Markdown System Studio</h1>
        <p className="lede">
          {demo
            ? 'Local demo. Projects stay in this browser. Open the S1 story, or start a project from one domain.'
            : 'WebGME host. Create stores a project in WebGME. An empty project starts with no diagrams until you add them.'}
        </p>
        <div className="cta-row">
          {demo ? (
            <Link className="btn primary" to="/p/demo/s1-aeb">
              Open S1 demo
            </Link>
          ) : null}
          <Link className={demo ? 'btn' : 'btn primary'} to="/projects">
            Projects
          </Link>
        </div>
      </div>
    </div>
  );
}
