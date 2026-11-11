import React from 'react';
import { Link } from 'react-router-dom';

export default function Welcome() {
  return (
    <div className="page welcome">
      <div className="welcome-hero">
        <p className="eyebrow">S1 · Automotive AEB / CACC</p>
        <h1>Markdown System Studio</h1>
        <p className="lede">
          The studio is on the first story. Open the demo, or start a project from one
          domain. An empty project starts with no diagrams until you add them.
        </p>
        <div className="cta-row">
          <Link className="btn primary" to="/p/demo/s1-aeb">
            Open S1 demo
          </Link>
          <Link className="btn" to="/projects">
            Projects
          </Link>
        </div>
      </div>
    </div>
  );
}
