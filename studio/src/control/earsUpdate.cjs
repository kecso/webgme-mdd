'use strict';

/**
 * EARS update walker.
 *
 * Decisions:
 * - A requirement is two kinds of line. `REQ-ID [pattern] risk=… verifymethod=…`
 *   creates the EARSRequirement and owns the node. The following sentence lines
 *   set text and the clause fields on that same node. The sentence line has no
 *   node of its own.
 * - A blank line closes a requirement only after its sentence has started, matching
 *   EarsAst. A blank between the header and the sentence does not close it.
 * - The first `#` line sets the diagram title. Later `#` lines are comments.
 * - pattern aliases match EarsAst (when means event, while means state, where
 *   means optional, if means unwanted).
 * - Clause splits match EarsAst: While / When / Where / If / The … shall ….
 *   When the sentence does not match, text is still stored. A ubiquitous
 *   sentence that does not match keeps the whole sentence as response.
 * - Removing the header deletes the requirement. Removing a sentence clears
 *   text and the clause fields. moveLine on the header sets order.
 */

const { walkLines, bind, remember, forget, lineAt } = require('./lineWalk.cjs');

const PATTERN_ALIASES = {
  ubiquitous: 'ubiquitous',
  ubi: 'ubiquitous',
  state: 'state',
  'state-driven': 'state',
  while: 'state',
  event: 'event',
  'event-driven': 'event',
  when: 'event',
  optional: 'optional',
  feature: 'optional',
  where: 'optional',
  unwanted: 'unwanted',
  if: 'unwanted',
  complex: 'complex'
};

function normalizePattern(raw) {
  if (!raw) return 'ubiquitous';
  const key = String(raw).trim().toLowerCase();
  return PATTERN_ALIASES[key] || key;
}

function classifyEarsLine(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { kind: 'blank' };
  if (trimmed.startsWith('%%')) return { kind: 'comment' };
  if (trimmed.startsWith('#')) {
    return { kind: 'title', title: trimmed.replace(/^#+\s*/, '').trim() };
  }
  const header = trimmed.match(/^(REQ[\w.-]+)\s*(?:\[([^\]]+)\])?\s*(.*)$/i);
  if (header) {
    const meta = {};
    String(header[3] || '').replace(/(\w+)\s*=\s*([^\s]+)/g, (_, key, value) => {
      meta[key.toLowerCase()] = value;
      return '';
    });
    return {
      kind: 'requirement',
      reqId: header[1],
      name: header[1],
      pattern: normalizePattern(header[2] || 'ubiquitous'),
      risk: meta.risk || '',
      verifymethod: meta.verifymethod || meta.verify || ''
    };
  }
  return { kind: 'body', text: trimmed };
}

function extractClauses(body, pattern) {
  const out = {
    precondition: '',
    trigger: '',
    feature: '',
    unwantedCondition: '',
    system: '',
    response: ''
  };
  if (!body) return out;
  const rest = body.replace(/\.$/, '').trim();
  const whileMatch = rest.match(/^While\s+(.+?),\s*(?:when\s+(.+?),\s*)?the\s+(.+?)\s+shall\s+(.+)$/i);
  if (whileMatch) {
    out.precondition = whileMatch[1].trim();
    if (whileMatch[2]) out.trigger = whileMatch[2].trim();
    out.system = whileMatch[3].trim();
    out.response = whileMatch[4].trim();
    return out;
  }
  const whenMatch = rest.match(/^When\s+(.+?),\s*the\s+(.+?)\s+shall\s+(.+)$/i);
  if (whenMatch) {
    out.trigger = whenMatch[1].trim();
    out.system = whenMatch[2].trim();
    out.response = whenMatch[3].trim();
    return out;
  }
  const whereMatch = rest.match(/^Where\s+(.+?),\s*the\s+(.+?)\s+shall\s+(.+)$/i);
  if (whereMatch) {
    out.feature = whereMatch[1].trim();
    out.system = whereMatch[2].trim();
    out.response = whereMatch[3].trim();
    return out;
  }
  const ifMatch = rest.match(/^If\s+(.+?),\s*then\s+the\s+(.+?)\s+shall\s+(.+)$/i);
  if (ifMatch) {
    out.unwantedCondition = ifMatch[1].trim();
    out.system = ifMatch[2].trim();
    out.response = ifMatch[3].trim();
    return out;
  }
  const ubiMatch = rest.match(/^The\s+(.+?)\s+shall\s+(.+)$/i);
  if (ubiMatch) {
    out.system = ubiMatch[1].trim();
    out.response = ubiMatch[2].trim();
    return out;
  }
  if (pattern === 'ubiquitous') out.response = rest;
  return out;
}

function hasBodyAbove(lines, blankIndex) {
  for (let i = blankIndex - 1; i >= 0; i -= 1) {
    const info = classifyEarsLine(lines[i].text);
    if (info.kind === 'body') return true;
    if (info.kind === 'requirement') return false;
    if (info.kind === 'comment' || info.kind === 'title' || info.kind === 'blank') continue;
    return false;
  }
  return false;
}

function owningHeader(lines, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    const info = classifyEarsLine(lines[i].text);
    if (info.kind === 'blank') {
      if (hasBodyAbove(lines, i)) return null;
      continue;
    }
    if (info.kind === 'comment' || info.kind === 'title') continue;
    if (info.kind === 'requirement') return lines[i];
    if (info.kind === 'body') continue;
    return null;
  }
  return null;
}

function earlierTitle(lines, index) {
  for (let i = 0; i < index && i < lines.length; i += 1) {
    if (classifyEarsLine(lines[i].text).kind === 'title') return true;
  }
  return false;
}

function createEarsRequirement(api, parentPath, spec) {
  return api.createChild(parentPath, 'EARSRequirement', {
    name: spec.reqId,
    reqId: spec.reqId,
    pattern: spec.pattern || 'ubiquitous',
    risk: spec.risk || '',
    verifymethod: spec.verifymethod || ''
  });
}

function setEarsHeader(api, nodePath, before, after) {
  if (!before || before.reqId !== after.reqId) {
    api.setAttribute(nodePath, 'name', after.reqId);
    api.setAttribute(nodePath, 'reqId', after.reqId);
  }
  if (!before || before.pattern !== after.pattern) api.setAttribute(nodePath, 'pattern', after.pattern);
  if (!before || before.risk !== after.risk) api.setAttribute(nodePath, 'risk', after.risk || '');
  if (!before || before.verifymethod !== after.verifymethod) {
    api.setAttribute(nodePath, 'verifymethod', after.verifymethod || '');
  }
}

function setEarsBody(api, nodePath, text, pattern) {
  const clauses = extractClauses(text, pattern);
  api.setAttribute(nodePath, 'text', text || '');
  api.setAttribute(nodePath, 'precondition', clauses.precondition);
  api.setAttribute(nodePath, 'trigger', clauses.trigger);
  api.setAttribute(nodePath, 'feature', clauses.feature);
  api.setAttribute(nodePath, 'unwantedCondition', clauses.unwantedCondition);
  api.setAttribute(nodePath, 'system', clauses.system);
  api.setAttribute(nodePath, 'response', clauses.response);
}

function setEarsTitle(api, diagramPath, title) {
  if (diagramPath) api.setAttribute(diagramPath, 'title', title);
}

function deleteEarsRequirement(api, nodePath) {
  api.deleteNode(nodePath);
}

function placeEarsRequirement(api, nodePath, index) {
  api.setAttribute(nodePath, 'order', index);
}

function headerPath(ctx, line) {
  if (!line) return null;
  if (line.nodePath) return line.nodePath;
  const info = classifyEarsLine(line.text);
  if (info.kind === 'requirement' && ctx.names.has(info.reqId)) return ctx.names.get(info.reqId);
  return null;
}

function seed(ctx) {
  ctx.working.forEach((line) => {
    const info = classifyEarsLine(line.text);
    if (info.kind === 'requirement' && line.nodePath) remember(ctx.names, info.reqId, line.nodePath);
  });
}

function onAdd(ctx, op) {
  const info = classifyEarsLine(op.text);
  const at = typeof op.index === 'number' ? op.index : ctx.working.length;
  switch (info.kind) {
    case 'title':
      if (!earlierTitle(ctx.working, at)) setEarsTitle(ctx.api, ctx.diagramNodePath, info.title);
      return null;
    case 'requirement':
      return addRequirement(ctx, op, info);
    case 'body':
      return addBody(ctx, op, at);
    default:
      return null;
  }
}

function addRequirement(ctx, op, info) {
  if (ctx.names.has(info.reqId)) {
    const nodePath = ctx.names.get(info.reqId);
    setEarsHeader(ctx.api, nodePath, null, info);
    return bind(ctx, op.lineId, nodePath);
  }
  const nodePath = createEarsRequirement(ctx.api, ctx.diagramNodePath, info);
  remember(ctx.names, info.reqId, nodePath);
  return bind(ctx, op.lineId, nodePath);
}

function addBody(ctx, op, at) {
  const header = owningHeader(ctx.working, at);
  const nodePath = headerPath(ctx, header);
  if (!nodePath) return null;
  const pattern = classifyEarsLine(header.text).pattern;
  setEarsBody(ctx.api, nodePath, String(op.text || '').trim(), pattern);
  return null;
}

function onRemove(ctx, beforeLine) {
  if (!beforeLine) return;
  const info = classifyEarsLine(beforeLine.text);
  if (info.kind === 'requirement' && beforeLine.nodePath) {
    deleteEarsRequirement(ctx.api, beforeLine.nodePath);
    forget(ctx.names, info.reqId);
    return;
  }
  if (info.kind === 'body') {
    const at = ctx.working.findIndex((line) => line.id === beforeLine.id);
    const header = owningHeader(ctx.working, at);
    const nodePath = headerPath(ctx, header);
    if (nodePath) setEarsBody(ctx.api, nodePath, '', classifyEarsLine(header.text).pattern);
  }
}

function onUpdate(ctx, beforeLine, op) {
  const before = classifyEarsLine(beforeLine ? beforeLine.text : '');
  const after = classifyEarsLine(op.text);
  const nodePath = (beforeLine && beforeLine.nodePath) || null;
  if (before.kind !== after.kind) {
    if (before.kind === 'requirement' && nodePath) {
      deleteEarsRequirement(ctx.api, nodePath);
      forget(ctx.names, before.reqId);
    }
    if (before.kind === 'body') onRemove(ctx, beforeLine);
    return onAdd(ctx, op);
  }
  if (after.kind === 'requirement' && !nodePath) return onAdd(ctx, op);
  const at = lineAt(ctx, op, beforeLine);
  switch (after.kind) {
    case 'title':
      if (!earlierTitle(ctx.working, at) && before.title !== after.title) {
        setEarsTitle(ctx.api, ctx.diagramNodePath, after.title);
      }
      return null;
    case 'requirement':
      if (before.reqId !== after.reqId) {
        forget(ctx.names, before.reqId);
        remember(ctx.names, after.reqId, nodePath);
      }
      setEarsHeader(ctx.api, nodePath, before, after);
      return nodePath;
    case 'body':
      return addBody(ctx, op, at);
    default:
      return null;
  }
}

function onMove(ctx, beforeLine, op) {
  if (!beforeLine || !beforeLine.nodePath) return;
  if (classifyEarsLine(beforeLine.text).kind === 'requirement') {
    placeEarsRequirement(ctx.api, beforeLine.nodePath, op.index);
  }
}

function walkEarsUpdate(baseline, lineOperations, api) {
  return walkLines(baseline, lineOperations, api, {
    seed,
    add: onAdd,
    remove: onRemove,
    update: onUpdate,
    move: onMove
  });
}

module.exports = {
  classifyEarsLine,
  extractClauses,
  walkEarsUpdate,
  createEarsRequirement,
  setEarsHeader,
  setEarsBody,
  setEarsTitle,
  deleteEarsRequirement,
  placeEarsRequirement
};
