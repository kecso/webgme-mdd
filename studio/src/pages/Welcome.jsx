import React from 'react';
import { Link } from 'react-router-dom';

export default function Welcome() {
  return (
    <div className="page welcome">
      <div className="welcome-hero">
        <p className="eyebrow">WebGME · Mermaid MDD</p>
        <h1>webgme-mdd Studio</h1>
        <p className="lede">
          View-only Mermaid projection with a widget overlay and a hideable source
          editor. Model changes go through DiagramControl — Apply is manual so
          re-import can become a structural delta, not a wipe.
        </p>
        <div className="cta-row">
          <Link className="btn primary" to="/projects">
            Projects
          </Link>
          <a className="btn" href="https://github.com/webgme/webgme-dss" target="_blank" rel="noreferrer">
            Pattern: webgme-dss
          </a>
        </div>
      </div>
      <ul className="welcome-notes">
        <li>Shell mirrors DSS: welcome → projects → domain settings → studio</li>
        <li>Canvas widget selects elements; control owns Core mutations + re-render</li>
        <li>Monaco source panel: edit freely, Apply when ready (ImportDelta TODO)</li>
      </ul>
    </div>
  );
}
