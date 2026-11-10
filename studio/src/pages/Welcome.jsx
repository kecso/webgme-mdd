import React from 'react';
import { Link } from 'react-router-dom';

export default function Welcome() {
  return (
    <div className="page welcome">
      <div className="welcome-hero">
        <p className="eyebrow">Markdown System Studio · MDSS</p>
        <h1>Markdown System Studio</h1>
        <p className="lede">
          Multi-view system models as Markdown/Mermaid (and EARS)—aligned with our
          validation stories—then publish the project as a <strong>browsable Markdown book</strong>.
          WebGME stays the consistency engine; the book is the shareable spine.
        </p>
        <div className="cta-row">
          <Link className="btn primary" to="/projects">
            Projects
          </Link>
          <Link className="btn" to="/p/demo/s1-aeb">
            Open S1 demo
          </Link>
        </div>
      </div>
      <ul className="welcome-notes">
        <li>
          <strong>Stories first</strong> — domains and chapters follow S1–S5 system narratives
        </li>
        <li>
          <strong>Studio</strong> — view-only Mermaid widget + control; Monaco Apply is manual
          (ImportDelta TODO)
        </li>
        <li>
          <strong>Book export</strong> — README + SUMMARY + chapters with fenced Mermaid/EARS for
          GitHub, mdBook, or in-app preview
        </li>
      </ul>
    </div>
  );
}
