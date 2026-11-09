'use strict';

/**
 * CommonJS mirror of the AMD MermaidAst for Node tooling/tests.
 * Keep behavior aligned with src/MermaidAst.js.
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

function detectType(src) {
  const token = stripComments(src).trim().split(/\s+/)[0];
  return KEYWORD_TO_TYPE[token] || null;
}

function parseTitle(lines) {
  for (const line of lines) {
    const m = line.match(/^\s*title\s+(.+)\s*$/i);
    if (m) return m[1].trim().replace(/^"|"$/g, '');
  }
  return null;
}

function parseFlowchart(src) {
  const lines = stripComments(src).split('\n');
  const header = lines[0] || '';
  const dirMatch = header.match(/^(?:flowchart|graph)\s+(\w+)/i);
  const nodes = {};
  const edges = [];
  const edgeRe = /([A-Za-z0-9_]+)\s*(-?\.?-+>?|=+>|--+)\s*(?:\|([^|]*)\|\s*)?([A-Za-z0-9_]+)/;

  lines.slice(1).forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'end' || /^subgraph\b/i.test(trimmed)) return;
    const em = trimmed.match(edgeRe);
    if (em) {
      nodes[em[1]] = nodes[em[1]] || { id: em[1], label: em[1] };
      nodes[em[4]] = nodes[em[4]] || { id: em[4], label: em[4] };
      edges.push({
        id: 'e' + idx,
        src: em[1],
        dst: em[4],
        label: (em[3] || '').trim(),
        lineStyle: em[2]
      });
    }
  });

  return {
    type: 'flowchart',
    name: 'Flowchart',
    title: parseTitle(lines),
    direction: dirMatch ? dirMatch[1] : 'TD',
    nodes: Object.values(nodes),
    edges,
    raw: src
  };
}

function parseSequence(src) {
  const lines = stripComments(src).split('\n');
  const participants = {};
  const messages = [];
  lines.slice(1).forEach((line, idx) => {
    const p = line.match(/^\s*(participant|actor)\s+(\S+)(?:\s+as\s+(.+))?\s*$/i);
    if (p) {
      participants[p[2]] = { id: p[2], alias: (p[3] || p[2]).trim(), kind: p[1].toLowerCase() };
      return;
    }
    const msg = line.match(/^\s*(\S+)\s*(-?>>?|-->>?|-x|--x|-\)|--\))\s*(\S+)\s*:\s*(.+)\s*$/);
    if (msg) {
      participants[msg[1]] = participants[msg[1]] || { id: msg[1], alias: msg[1], kind: 'participant' };
      participants[msg[3]] = participants[msg[3]] || { id: msg[3], alias: msg[3], kind: 'participant' };
      messages.push({
        id: 'm' + idx,
        from: msg[1],
        to: msg[3],
        arrowType: msg[2],
        label: msg[4].trim()
      });
    }
  });
  return {
    type: 'sequence',
    name: 'Sequence',
    title: parseTitle(lines),
    participants: Object.values(participants),
    messages,
    raw: src
  };
}

function parse(src, expectedType) {
  if (!src || !String(src).trim()) throw new Error('Empty Mermaid source');
  const detected = detectType(src);
  if (expectedType && detected && detected !== expectedType) {
    throw new Error(`Expected diagram type "${expectedType}" but source starts as "${detected}"`);
  }
  const type = expectedType || detected;
  if (!type) throw new Error('Could not detect Mermaid diagram type from source');
  if (type === 'flowchart') return parseFlowchart(src);
  if (type === 'sequence') return parseSequence(src);
  const lines = stripComments(src).split('\n');
  return {
    type,
    name: type,
    title: parseTitle(lines),
    lines: lines.slice(1).map((l) => l.trim()).filter(Boolean),
    raw: src
  };
}

module.exports = {
  KEYWORD_TO_TYPE,
  detectType,
  parse
};
