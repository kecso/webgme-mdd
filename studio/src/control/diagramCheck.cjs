'use strict';

/**
 * Syntax check for Apply.
 *
 * Mermaid parses a diagram before it builds an SVG. Apply uses that same
 * parse (`mermaid.parse`) and writes nothing when the text is not valid for
 * the diagram's type. Use case is not a Mermaid diagram type in this version.
 * Changing the diagram's type is refused even when the new text parses.
 *
 * EARS uses EarsAst, the same grammar as import and the catalog check. The
 * walk reports the first problem with its line: a line that is not a header,
 * an unknown pattern, or a sentence that does not match its pattern.
 */

const EarsAst = require('../../../packages/shared/cjs/EarsAst');

const ACCEPTED = {
  flowchart: ['flowchart', 'flowchart-v2'],
  sequence: ['sequence'],
  state: ['state', 'stateDiagram'],
  class: ['class', 'classDiagram'],
  er: ['er'],
  requirement: ['requirement'],
  c4: ['c4'],
  architecture: ['architecture'],
  gantt: ['gantt'],
  block: ['block'],
  kanban: ['kanban']
};

const KEYWORD = {
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

let mermaidPromise;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => mod.default || mod);
  }
  return mermaidPromise;
}

function textOf(lines) {
  if (typeof lines === 'string') return lines;
  return (lines || []).map((line) => (typeof line === 'string' ? line : (line && line.text) || '')).join('\n');
}

function clip(text) {
  const line = String(text || '').replace(/\s+/g, ' ').trim();
  return line.length > 240 ? line.slice(0, 237) + '...' : line;
}

function refusal(diagramType, problem) {
  return {
    ok: false,
    message: 'This is not a valid ' + diagramType + ' diagram. Correct the text and apply to the model again. ' + problem
  };
}

function errorText(error) {
  return String((error && (error.message || error.str)) || error || '');
}

function environmentError(error) {
  return /DOMPurify|document is not defined/i.test(errorText(error));
}

function declaredType(text) {
  const rows = String(text || '').replace(/^\uFEFF/, '').split('\n');
  for (const row of rows) {
    const line = row.trim();
    if (!line || line.startsWith('%%') || line.startsWith('#')) continue;
    const keyword = line.split(/\s+/)[0] || '';
    if (KEYWORD[keyword]) return KEYWORD[keyword];
    if (/^REQ[\w.-]+/i.test(line)) return 'ears';
    return '';
  }
  return '';
}

function typeName(diagramType) {
  const names = {
    flowchart: 'flowchart',
    sequence: 'sequence',
    state: 'state',
    class: 'class',
    er: 'ER',
    ears: 'EARS',
    usecase: 'use case',
    requirement: 'requirement',
    c4: 'C4',
    architecture: 'architecture',
    gantt: 'Gantt',
    block: 'block',
    kanban: 'kanban'
  };
  return names[diagramType] || diagramType;
}

function studioTypeOf(parsed) {
  const found = Object.keys(ACCEPTED).find((studio) => ACCEPTED[studio].indexOf(parsed) !== -1);
  return found || '';
}

function typeChange(diagramType, detected) {
  return {
    ok: false,
    code: 'type-change',
    message: 'Changing the diagram type is not allowed. This diagram stays ' +
      typeName(diagramType) + '; the text is a ' + typeName(detected) + ' diagram.'
  };
}

function wrongType(diagramType, detected) {
  if (detected && detected !== diagramType) {
    return 'Mermaid read this as a ' + typeName(detected) + ' diagram.';
  }
  return 'Mermaid did not read this as a ' + typeName(diagramType) + ' diagram.';
}

const EARS_PATTERNS = ['ubiquitous', 'state', 'event', 'optional', 'unwanted', 'complex'];
const EARS_FORM = {
  ubiquitous: 'The … shall …',
  state: 'While …, the … shall …',
  event: 'When …, the … shall …',
  optional: 'Where …, the … shall …',
  unwanted: 'If …, then the … shall …',
  complex: 'While …, when …, the … shall …'
};

function earsLine(lineNo, problem) {
  return 'Line ' + lineNo + ': ' + problem;
}

function readEarsHeader(line) {
  const match = line.match(/^(REQ[\w.-]+)(?:\s+(.*))?$/i);
  if (!match) return null;
  const reqId = match[1];
  let rest = (match[2] || '').trim();
  let rawPattern = '';
  if (rest.startsWith('[')) {
    const closed = rest.match(/^\[([^\]]*)\]\s*(.*)$/);
    if (!closed) return { reqId, unclosed: true };
    rawPattern = closed[1].trim();
    rest = (closed[2] || '').trim();
  }
  for (const token of rest ? rest.split(/\s+/) : []) {
    const pair = token.match(/^(\w+)=(\S+)$/);
    if (!pair) return { reqId, unexpected: token };
    const key = pair[1].toLowerCase();
    if (key !== 'risk' && key !== 'verifymethod' && key !== 'verify') return { reqId, unknownField: key };
  }
  const pattern = rawPattern ? EarsAst.normalizePattern(rawPattern) : 'ubiquitous';
  return {
    reqId,
    rawPattern,
    pattern,
    known: !rawPattern || EARS_PATTERNS.indexOf(pattern) !== -1
  };
}

function earsSentenceProblem(reqId, pattern, body) {
  const header = reqId + ' [' + pattern + ']';
  const req = EarsAst.parse(header + '\n' + body).requirements[0];
  if (req && EarsAst.wellFormed(req)) return '';
  return 'needs a sentence of the form "' + (EARS_FORM[pattern] || EARS_FORM.ubiquitous) + '".';
}

function checkEars(text) {
  const rows = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const seen = new Map();
  let open = null;

  function closeOpen() {
    if (!open) return '';
    const current = open;
    open = null;
    if (!current.bodyLines.length) return earsLine(current.line, current.reqId + ' has no sentence.');
    const reason = earsSentenceProblem(current.reqId, current.pattern, current.bodyLines.join(' '));
    if (reason) return earsLine(current.bodyLine, current.reqId + ' ' + reason);
    return '';
  }

  for (let i = 0; i < rows.length; i += 1) {
    const lineNo = i + 1;
    const line = rows[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('%%')) {
      if (!line && open && open.bodyLines.length) {
        const problem = closeOpen();
        if (problem) return problem;
      }
      continue;
    }
    const header = readEarsHeader(line);
    if (header) {
      const problem = closeOpen();
      if (problem) return problem;
      if (header.unclosed) return earsLine(lineNo, 'the pattern bracket is not closed.');
      if (header.unexpected) return earsLine(lineNo, 'unexpected text "' + header.unexpected + '" after the requirement id.');
      if (header.unknownField) return earsLine(lineNo, 'unknown field "' + header.unknownField + '".');
      if (!header.known) {
        return earsLine(lineNo, 'unknown pattern "' + header.rawPattern + '". Expected ' + EARS_PATTERNS.join(', ') + '.');
      }
      const previous = seen.get(header.reqId.toLowerCase());
      if (previous) return earsLine(lineNo, header.reqId + ' is already defined on line ' + previous + '.');
      seen.set(header.reqId.toLowerCase(), lineNo);
      open = { reqId: header.reqId, pattern: header.pattern, line: lineNo, bodyLine: 0, bodyLines: [] };
      continue;
    }
    if (!open) return earsLine(lineNo, 'this line is not a requirement header.');
    if (!open.bodyLine) open.bodyLine = lineNo;
    open.bodyLines.push(line);
  }
  return closeOpen();
}

async function checkDiagram(diagramType, lines) {
  const text = textOf(lines);
  const declared = declaredType(text);
  if (declared && declared !== diagramType) return typeChange(diagramType, declared);
  if (diagramType === 'ears') {
    const problem = checkEars(text);
    if (problem) return refusal('ears', problem);
    return { ok: true };
  }
  const accepted = ACCEPTED[diagramType];
  if (!accepted) return { ok: true };
  const mermaid = await loadMermaid();
  try {
    const result = await mermaid.parse(text);
    const parsed = result && result.diagramType;
    const parsedType = studioTypeOf(parsed);
    if (parsedType && parsedType !== diagramType) return typeChange(diagramType, parsedType);
    if (accepted.indexOf(parsed) === -1) return refusal(diagramType, wrongType(diagramType, parsedType));
    return { ok: true };
  } catch (error) {
    if (environmentError(error)) {
      if (declared === diagramType) return { ok: true };
      return refusal(diagramType, wrongType(diagramType, declared));
    }
    const message = errorText(error);
    if (/No diagram type detected/i.test(message)) {
      return refusal(diagramType, wrongType(diagramType, declared));
    }
    const detail = message
      .split('\n')
      .map((row) => row.trim())
      .filter((row) => row && !/^-+[\^]*$/.test(row))
      .slice(0, 3)
      .join(' ');
    return refusal(diagramType, clip(detail || 'Mermaid could not parse this text.'));
  }
}

module.exports = {
  checkDiagram
};
