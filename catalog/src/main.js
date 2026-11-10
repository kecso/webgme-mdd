import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'strict'
});

const state = {
  catalog: null,
  selectedId: null,
  filter: '',
  statuses: new Set(['stable', 'beta', 'experimental', 'companion'])
};

const els = {
  list: document.getElementById('diagramList'),
  detail: document.getElementById('detail'),
  stats: document.getElementById('stats'),
  filter: document.getElementById('filter'),
  statusFilters: document.getElementById('statusFilters')
};

function matches(diagram) {
  if (!state.statuses.has(diagram.status)) return false;
  const q = state.filter.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    diagram.id,
    diagram.name,
    diagram.status,
    ...(diagram.keywords || []),
    ...(diagram.domains || []),
    ...(diagram.capabilities || [])
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function allEntries() {
  return [
    ...(state.catalog.diagrams || []),
    ...(state.catalog.companionLanguages || [])
  ];
}

function renderStats() {
  const diagrams = state.catalog.diagrams || [];
  const companions = state.catalog.companionLanguages || [];
  const domains = new Set(Object.keys(state.catalog.domainIndex || {}));
  const byStatus = diagrams.concat(companions).reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});
  els.stats.innerHTML = [
    ['Diagrams', diagrams.length],
    ['Companions', companions.length],
    ['Domains', domains.size],
    ['Stable', byStatus.stable || 0],
    ['Beta', byStatus.beta || 0],
    ['Experimental', byStatus.experimental || 0]
  ]
    .map(
      ([label, value]) =>
        `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`
    )
    .join('');
}

function renderStatusFilters() {
  els.statusFilters.innerHTML = ['stable', 'beta', 'experimental', 'companion']
    .map((s) => {
      const active = state.statuses.has(s) ? 'active' : '';
      return `<button type="button" class="chip ${active}" data-status="${s}">${s}</button>`;
    })
    .join('');
}

function renderList() {
  const items = allEntries().filter(matches);
  els.list.innerHTML = items
    .map((d) => {
      const active = d.id === state.selectedId ? 'active' : '';
      return `<button type="button" class="${active}" data-id="${d.id}">
        <span class="name">${d.name}</span>
        <span class="meta">${d.id} · ${d.status}</span>
      </button>`;
    })
    .join('');
}

async function renderDetail(id) {
  const diagram = allEntries().find((d) => d.id === id);
  if (!diagram) return;

  const [metaRes, sampleRes] = await Promise.all([
    fetch(`/api/meta/${id}`),
    fetch(`/api/sample/${id}`)
  ]);
  const meta = await metaRes.json();
  const sample = await sampleRes.text();
  const concepts = (meta.children || []).map((c) => c.id.replace(/^@meta:/, ''));

  els.detail.className = 'detail';
  els.detail.innerHTML = `
    <article class="panel">
      <div class="title-row">
        <h2>${diagram.name}</h2>
        <span class="badge ${diagram.status}">${diagram.status}</span>
      </div>
      <p>WebGME project: <code>diagrams/${diagram.id}</code>${
        diagram.notMermaid
          ? ' · <em>companion language (not Mermaid)</em>'
          : ''
      }</p>
      <h3>Keywords</h3>
      <div class="tags">${(diagram.keywords || []).map((k) => `<span class="tag"><code>${k}</code></span>`).join('')}</div>
      <h3>Domains</h3>
      <div class="tags">${(diagram.domains || []).map((k) => `<span class="tag">${k}</span>`).join('')}</div>
      <h3>Capabilities</h3>
      <ul class="clean">${(diagram.capabilities || []).map((c) => `<li>${c}</li>`).join('')}</ul>
    </article>

    <div class="grid-2">
      <article class="panel">
        <h2>Sample</h2>
        <pre>${escapeHtml(sample)}</pre>
        <h3>${diagram.notMermaid ? 'Preview' : 'Render'}</h3>
        <div class="mermaid-host" id="mermaidHost"></div>
      </article>
      <article class="panel">
        <h2>Metamodel concepts</h2>
        <div class="tags">${concepts.map((c) => `<span class="tag">${c}</span>`).join('')}</div>
        <h3>Language.json (excerpt)</h3>
        <pre>${escapeHtml(JSON.stringify(meta, null, 2).slice(0, 1800))}${
          JSON.stringify(meta).length > 1800 ? '\n…' : ''
        }</pre>
      </article>
    </div>
  `;

  const host = document.getElementById('mermaidHost');
  if (diagram.notMermaid) {
    host.innerHTML =
      '<p>Textual specification language — no Mermaid render. See sample and META.</p>';
    return;
  }
  try {
    const { svg } = await mermaid.render(`mmd-${id}-${Date.now()}`, sample);
    host.innerHTML = svg;
  } catch (err) {
    host.innerHTML = `<p class="error">Mermaid render skipped: ${escapeHtml(
      err.message || String(err)
    )}</p>`;
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

els.list.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  state.selectedId = btn.dataset.id;
  renderList();
  renderDetail(state.selectedId);
});

els.statusFilters.addEventListener('click', (e) => {
  const chip = e.target.closest('button[data-status]');
  if (!chip) return;
  const s = chip.dataset.status;
  if (state.statuses.has(s)) state.statuses.delete(s);
  else state.statuses.add(s);
  renderStatusFilters();
  renderList();
});

els.filter.addEventListener('input', () => {
  state.filter = els.filter.value;
  renderList();
});

const catalog = await fetch('/api/catalog').then((r) => r.json());
state.catalog = catalog;
renderStats();
renderStatusFilters();
renderList();

// Deep-link ?d=flowchart
const params = new URLSearchParams(location.search);
const initial = params.get('d') || 'flowchart';
if (allEntries().some((d) => d.id === initial)) {
  state.selectedId = initial;
  renderList();
  renderDetail(initial);
}
