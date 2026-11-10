import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import mermaid from 'mermaid';
import { getProject } from '../data/demoStore.js';
import {
  bookToBundle,
  buildMarkdownBook,
  renderBookMarkdown
} from '../book/buildMarkdownBook.js';

mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' });

export default function BookPreview() {
  const { owner, name } = useParams();
  const projectId = `${owner}+${name}`;
  const [search, setSearch] = useSearchParams();
  const [stories, setStories] = useState(null);
  const [renderError, setRenderError] = useState(null);

  const project = getProject(projectId);

  useEffect(() => {
    fetch('/api/stories')
      .then((r) => r.json())
      .then(setStories)
      .catch(() => setStories({ stories: [] }));
  }, []);

  const story = useMemo(() => {
    if (!stories?.stories || !project?.storyId) return null;
    return stories.stories.find((s) => s.id === project.storyId) || null;
  }, [stories, project]);

  const book = useMemo(() => {
    if (!project) return null;
    return buildMarkdownBook(project, { story });
  }, [project, story]);

  const pagePath = search.get('page') || 'README.md';
  const file = book?.files.find((f) => f.path === pagePath) || book?.files[0];

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    (async () => {
      setRenderError(null);
      // Render mermaid fences after HTML mount
      await new Promise((r) => requestAnimationFrame(r));
      if (cancelled) return;
      const nodes = document.querySelectorAll('.book-article pre.md-fence[data-lang="mermaid"]');
      let i = 0;
      for (const pre of nodes) {
        const code = pre.querySelector('code')?.textContent || '';
        try {
          const id = `book-mmd-${Date.now()}-${i++}`;
          const { svg } = await mermaid.render(id, code);
          if (cancelled) return;
          const wrap = document.createElement('div');
          wrap.className = 'book-mermaid';
          wrap.innerHTML = svg;
          pre.replaceWith(wrap);
        } catch (e) {
          pre.insertAdjacentHTML(
            'afterend',
            `<p class="book-error">${(e && e.message) || e}</p>`
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file?.path, file?.content]);

  if (!project || !book) {
    return (
      <div className="page">
        <p>Project not found.</p>
        <Link to="/projects">Projects</Link>
      </div>
    );
  }

  const html = renderBookMarkdown(file?.content || '');

  const downloadBundle = () => {
    const text = bookToBundle(book);
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name || 'system'}-book.mdbundle.txt`;
    a.click();
    URL.revokeObjectURL(url);
    // TODO: zip of real folder (README/SUMMARY/chapters) via fflate
  };

  return (
    <div className="book-shell">
      <header className="studio-header">
        <div className="brand-block">
          <Link to="/" className="brand">
            MDSS
          </Link>
          <span className="project-chip">Book · {project.owner}/{project.name}</span>
        </div>
        <div className="header-actions">
          <button type="button" className="btn" onClick={downloadBundle}>
            Download MD bundle
          </button>
          <Link className="btn" to={`/p/${owner}/${name}`}>
            Back to studio
          </Link>
        </div>
      </header>
      <div className="book-body">
        <nav className="book-toc">
          <div className="rail-title">Contents</div>
          <button
            type="button"
            className={pagePath === 'README.md' ? 'active' : ''}
            onClick={() => setSearch({ page: 'README.md' })}
          >
            Cover
          </button>
          <button
            type="button"
            className={pagePath === 'SUMMARY.md' ? 'active' : ''}
            onClick={() => setSearch({ page: 'SUMMARY.md' })}
          >
            Summary
          </button>
          {book.toc.map((t) => (
            <button
              key={t.path}
              type="button"
              className={pagePath === t.path ? 'active' : ''}
              onClick={() => setSearch({ page: t.path })}
            >
              {t.title}
            </button>
          ))}
          <button
            type="button"
            className={pagePath === 'traces.md' ? 'active' : ''}
            onClick={() => setSearch({ page: 'traces.md' })}
          >
            Traces
          </button>
        </nav>
        <article
          className="book-article"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      {renderError ? <p className="book-error">{renderError}</p> : null}
    </div>
  );
}
