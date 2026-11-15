/**
 * Identify a diagram text file.
 * Mermaid is recognized from its header keyword. EARS is recognized from
 * requirement lines, or from a .ears file name.
 */

const KEYWORD_TO_TYPE = {
  flowchart: 'flowchart',
  graph: 'flowchart',
  sequenceDiagram: 'sequence',
  classDiagram: 'class',
  stateDiagram: 'state',
  'stateDiagram-v2': 'state',
  erDiagram: 'er',
  journey: 'journey',
  gantt: 'gantt',
  pie: 'pie',
  quadrantChart: 'quadrant',
  requirementDiagram: 'requirement',
  gitGraph: 'gitgraph',
  C4Context: 'c4',
  C4Container: 'c4',
  C4Component: 'c4',
  C4Dynamic: 'c4',
  C4Deployment: 'c4',
  mindmap: 'mindmap',
  timeline: 'timeline',
  kanban: 'kanban',
  'sankey-beta': 'sankey',
  sankey: 'sankey',
  'xychart-beta': 'xychart',
  xychart: 'xychart',
  'block-beta': 'block',
  block: 'block',
  'packet-beta': 'packet',
  packet: 'packet',
  'architecture-beta': 'architecture',
  architecture: 'architecture',
  'radar-beta': 'radar',
  radar: 'radar',
  'treemap-beta': 'treemap',
  treemap: 'treemap',
  ishikawa: 'ishikawa',
  'ishikawa-beta': 'ishikawa',
  fishbone: 'ishikawa',
  'usecase-beta': 'usecase',
  usecase: 'usecase',
  'eventmodeling-beta': 'eventmodeling',
  eventmodeling: 'eventmodeling',
  venn: 'venn',
  treeView: 'treeview',
  'wardley-beta': 'wardley',
  wardley: 'wardley',
  cynefin: 'cynefin',
  railroad: 'railroad'
};

function stripComments(src) {
  return src
    .split('\n')
    .filter((line) => !/^\s*%%/.test(line))
    .join('\n');
}

function firstKeyword(src) {
  const cleaned = stripComments(src).trim();
  return cleaned.split(/\s+/)[0] || '';
}

function withNewline(src) {
  return src.endsWith('\n') ? src : `${src}\n`;
}

function looksLikeEars(src) {
  return (
    /(?:^|\n)\s*REQ[-A-Za-z0-9_]*/.test(src) ||
    /\[(ubiquitous|state|event|optional|unwanted|complex)\]/i.test(src)
  );
}

function mermaidFence(src) {
  const match = src.match(/```(?:mermaid|mmd)?[^\n]*\n([\s\S]*?)```/i);
  return match ? match[1].trim() : '';
}

/**
 * @param {string} text
 * @param {string} [fileName]
 * @returns {{ type: string|null, source: string, reason?: 'empty'|'unknown' }}
 */
export function detectDiagramSource(text, fileName = '') {
  const raw = String(text || '').replace(/^\uFEFF/, '');
  if (!raw.trim()) return { type: null, source: '', reason: 'empty' };

  const ext = (String(fileName).split('.').pop() || '').toLowerCase();
  const fenced = mermaidFence(raw);
  const body = fenced || raw;
  const keyword = firstKeyword(body);
  const mermaidType = KEYWORD_TO_TYPE[keyword] || null;

  if (mermaidType) {
    return { type: mermaidType, source: withNewline(body.trim()) };
  }
  if (ext === 'ears' || looksLikeEars(raw)) {
    return { type: 'ears', source: withNewline(raw.trim()) };
  }
  return { type: null, source: withNewline(raw.trim()), reason: 'unknown' };
}

export function nameFromFile(fileName, diagramType) {
  const base = String(fileName || '')
    .replace(/\.[^.]+$/, '')
    .trim();
  const safe = base.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
  return safe || `${diagramType}-1`;
}
