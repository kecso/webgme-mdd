/**
 * Build a browsable Markdown "book" from a studio project.
 * Shape aligns with mdBook/GitBook: README + SUMMARY + chapters/*.md
 */

/**
 * @typedef {object} BookFile
 * @property {string} path  relative path inside the book
 * @property {string} content
 */

/**
 * @typedef {object} MarkdownBook
 * @property {string} title
 * @property {BookFile[]} files
 * @property {{ id: string, title: string, path: string }[]} toc
 */

/**
 * @param {object} project  demoStore project
 * @param {object} [opts]
 * @param {object|null} [opts.story]  stories.json entry
 * @param {object|null} [opts.catalog]
 * @returns {MarkdownBook}
 */
export function buildMarkdownBook(project, opts = {}) {
  const story = opts.story || null;
  const title = project.title || project.name || 'System model';
  const diagrams = Object.entries(project.diagrams || {}).map(([key, d]) => ({
    key,
    ...d
  }));

  // Prefer story required order when present
  const order = story?.requiredDiagrams || project.enabledDomains || [];
  diagrams.sort((a, b) => {
    const ia = order.indexOf(a.domainId);
    const ib = order.indexOf(b.domainId);
    const sa = ia === -1 ? 999 : ia;
    const sb = ib === -1 ? 999 : ib;
    if (sa !== sb) return sa - sb;
    return (a.name || '').localeCompare(b.name || '');
  });

  const toc = [];
  const files = [];
  const chapterDir = 'chapters';

  diagrams.forEach((d, i) => {
    const n = String(i + 1).padStart(2, '0');
    const slug = slugify(`${d.domainId}-${d.name || d.key}`);
    const path = `${chapterDir}/${n}-${slug}.md`;
    const fence = d.domainId === 'ears' ? 'ears' : 'mermaid';
    const heading = d.name || d.key;
    const body = [
      `# ${heading}`,
      '',
      `Domain: \`${d.domainId}\` · Instance: \`${d.key}\``,
      '',
      d.updatedAt ? `Last applied: ${d.updatedAt}` : '',
      '',
      '## Diagram source',
      '',
      '```' + fence,
      String(d.source || '').trimEnd(),
      '```',
      '',
      '## Notes',
      '',
      '_TODO: chapter prose, Integrating traces, and validation results._',
      ''
    ]
      .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
      .join('\n');

    files.push({ path, content: body });
    toc.push({ id: d.key, title: heading, path, domainId: d.domainId });
  });

  const readme = [
    `# ${title}`,
    '',
    story
      ? [
          `> Story **${story.id}**: ${story.title}`,
          '',
          story.file ? `Template: \`docs/stories/${story.file}\`` : '',
          ''
        ].join('\n')
      : '',
    '## About this book',
    '',
    'Exported from **Markdown System Studio** (MDSS). Each chapter is a system view',
    'authored as Markdown/Mermaid (or EARS). The studio keeps WebGME as the',
    'consistency backbone; this book is the browsable, shareable spine.',
    '',
    '## Enabled domains',
    '',
    ...(project.enabledDomains || []).map((id) => `- \`${id}\``),
    '',
    story?.integrationPairs?.length
      ? [
          '## Intended integration checks',
          '',
          ...story.integrationPairs.map(
            (p) => `- ${p.from} → ${p.to}: \`${p.check}\``
          ),
          ''
        ].join('\n')
      : '',
    '## Contents',
    '',
    ...toc.map((t, i) => `${i + 1}. [${t.title}](${t.path}) (\`${t.domainId}\`)`),
    '',
    '---',
    '',
    `_Generated ${new Date().toISOString()}_`,
    ''
  ].join('\n');

  const summaryLines = [
    `# Summary`,
    '',
    `* [${title}](README.md)`,
    ...toc.map((t) => `* [${t.title}](${t.path})`),
    ''
  ];

  files.unshift(
    { path: 'README.md', content: readme },
    { path: 'SUMMARY.md', content: summaryLines.join('\n') }
  );

  // Placeholder for cross-view traces
  files.push({
    path: 'traces.md',
    content: [
      '# Cross-view traces',
      '',
      'TODO(integrating): export Correspondence / `specifiesBody` / `sameAs` links as tables.',
      '',
      story?.integrationPairs?.length
        ? [
            '## Story checklist',
            '',
            '| From | To | Check | Status |',
            '|------|----|-------|--------|',
            ...story.integrationPairs.map(
              (p) => `| ${p.from} | ${p.to} | ${p.check} | _pending_ |`
            ),
            ''
          ].join('\n')
        : '',
      ''
    ].join('\n')
  });

  return { title, files, toc };
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/**
 * Serialize book to a single downloadable text bundle (concatenated files).
 * TODO: zip via fflate when we want a real folder download.
 */
export function bookToBundle(book) {
  const parts = book.files.map(
    (f) => `--- FILE: ${f.path} ---\n${f.content.trimEnd()}\n`
  );
  return parts.join('\n');
}

/**
 * Very small Markdown → HTML for in-studio browsing (fences + headings + lists).
 * Not a full MD engine — enough for book preview.
 */
export function renderBookMarkdown(md) {
  const escaped = String(md || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const blocks = [];
  const lines = escaped.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || '';
      const body = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        `<pre class="md-fence" data-lang="${lang}"><code>${body.join('\n')}</code></pre>`
      );
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(`<h1>${inline(line.slice(2))}</h1>`);
      i += 1;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(`<h2>${inline(line.slice(3))}</h2>`);
      i += 1;
      continue;
    }
    if (line.startsWith('> ')) {
      blocks.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
      i += 1;
      continue;
    }
    if (line.startsWith('| ') && lines[i + 1]?.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|\s*-/.test(lines[i])) rows.push(lines[i]);
        i += 1;
      }
      const htmlRows = rows.map((r, idx) => {
        const cells = r
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        const tag = idx === 0 ? 'th' : 'td';
        return `<tr>${cells.map((c) => `<${tag}>${inline(c)}</${tag}>`).join('')}</tr>`;
      });
      blocks.push(`<table>${htmlRows.join('')}</table>`);
      continue;
    }
    if (line.startsWith('- ')) {
      const items = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(`<li>${inline(lines[i].slice(2))}</li>`);
        i += 1;
      }
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\d+\.\s/, ''))}</li>`);
        i += 1;
      }
      blocks.push(`<ol>${items.join('')}</ol>`);
      continue;
    }
    if (line.trim() === '' || line.trim() === '---') {
      if (line.trim() === '---') blocks.push('<hr />');
      i += 1;
      continue;
    }
    blocks.push(`<p>${inline(line)}</p>`);
    i += 1;
  }
  return blocks.join('\n');
}

function inline(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
