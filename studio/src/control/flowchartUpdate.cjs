'use strict';

/**
 * Flowchart update walker.
 *
 * Starts from diagram-level line operations (addLine, removeLine, updateText,
 * moveLine). Each operation is classified as a header, title, node, edge,
 * subgraph, end, comment, or unknown. The case then calls a named model
 * transaction. Those transactions are the only place that changes the model:
 * create a node, set its label, create an edge and point src and dst at a
 * Node or a Subgraph, delete an element, or record a new order.
 *
 * A line that has no WebGME node yet is created from the text of that
 * operation. Lines the edit did not touch are left alone.
 *
 * An edge can be the only mention of its nodes. At the end of the walk, a
 * node or subgraph name that the remaining lines neither declare nor use is
 * deleted. The edge line's own node is deleted with that line.
 *
 * A new node or edge is created under the open subgraph when that subgraph
 * already has a node path, and under the diagram node otherwise.
 *
 * Limitation, shared with the line folder: moveLine is only one editor gesture
 * that relocates a single unique line. Cutting a line and typing it again
 * later is a removal plus an addition, so the new line gets a new node.
 */

const { dropUnindexed, releaseUnreferenced } = require('./lineWalk.cjs');

const ARROW = /(-?\.?-+>|==+>|=+>|--+|==+)/;

function shapeOf(body) {
  if (body.startsWith('([')) return 'stadium';
  if (body.startsWith('[(')) return 'cylinder';
  if (body.startsWith('[[')) return 'subroutine';
  if (body.startsWith('((')) return 'circle';
  if (body.startsWith('{{')) return 'hexagon';
  if (body.startsWith('[/')) return 'trapezoid';
  if (body.startsWith('[\\')) return 'trapezoidAlt';
  if (body.startsWith('>')) return 'asymmetric';
  if (body.startsWith('{')) return 'decision';
  if (body.startsWith('(')) return 'round';
  if (body.startsWith('[')) return 'rect';
  return '';
}

function parseDecl(token) {
  const raw = String(token || '').trim();
  const match = raw.match(/^([A-Za-z_][A-Za-z0-9_]*)(.*)$/);
  if (!match) return null;
  const name = match[1];
  const body = (match[2] || '').trim();
  if (!body) return { name, label: name, shape: '' };
  const shape = shapeOf(body);
  if (!shape) return null;
  const label = body.replace(/^[[({>/\\]+/, '').replace(/[\]})\\/]+$/, '');
  return { name, label: label || name, shape };
}

function matchEdge(trimmed) {
  const parts = trimmed.split(ARROW);
  if (parts.length < 3) return null;
  const srcDecl = parseDecl(parts[0]);
  const dstDecl = parseDecl(parts.slice(2).join('').replace(/^\|([^|]*)\|\s*/, ''));
  if (!srcDecl || !dstDecl) return null;
  const labelMatch = parts.slice(2).join('').match(/^\|([^|]*)\|/);
  return {
    kind: 'edge',
    src: srcDecl.name,
    dst: dstDecl.name,
    label: labelMatch ? labelMatch[1].trim() : '',
    lineStyle: parts[1],
    srcDecl,
    dstDecl
  };
}

function classifyFlowLine(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.startsWith('%%')) return { kind: 'comment' };
  let match = trimmed.match(/^(?:flowchart|graph)\s+(\w+)/i);
  if (match) return { kind: 'header', direction: match[1] };
  match = trimmed.match(/^title\s+(.+)$/i);
  if (match) return { kind: 'title', title: match[1].trim() };
  if (/^end$/i.test(trimmed)) return { kind: 'end' };
  match = trimmed.match(/^subgraph\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\[(.*)\])?(?:\s+direction\s+(\w+))?\s*$/i);
  if (match) {
    return {
      kind: 'subgraph',
      name: match[1],
      label: (match[2] || match[1]).trim(),
      direction: match[3] || ''
    };
  }
  if (/^subgraph\b/i.test(trimmed)) return { kind: 'unknown', text: trimmed };
  const edge = matchEdge(trimmed);
  if (edge) return edge;
  const decl = parseDecl(trimmed);
  if (decl) return { kind: 'node', name: decl.name, label: decl.label, shape: decl.shape };
  return { kind: 'unknown', text: trimmed };
}

function createFlowNode(api, parentPath, spec) {
  return api.createChild(parentPath, 'Node', {
    name: spec.name,
    label: spec.label,
    shape: spec.shape || '',
    styleClass: ''
  });
}

function setFlowNodeText(api, nodePath, spec) {
  if (Object.prototype.hasOwnProperty.call(spec, 'name')) api.setAttribute(nodePath, 'name', spec.name);
  if (Object.prototype.hasOwnProperty.call(spec, 'label')) api.setAttribute(nodePath, 'label', spec.label);
  if (Object.prototype.hasOwnProperty.call(spec, 'shape')) api.setAttribute(nodePath, 'shape', spec.shape || '');
}

function createFlowEdge(api, parentPath, spec) {
  const nodePath = api.createChild(parentPath, 'Edge', {
    name: spec.name || '',
    label: spec.label || '',
    lineStyle: spec.lineStyle || '',
    arrowStyle: ''
  });
  if (spec.srcPath) api.setPointer(nodePath, 'src', spec.srcPath);
  if (spec.dstPath) api.setPointer(nodePath, 'dst', spec.dstPath);
  return nodePath;
}

function setFlowEdgeEnds(api, nodePath, srcPath, dstPath) {
  if (srcPath) api.setPointer(nodePath, 'src', srcPath);
  if (dstPath) api.setPointer(nodePath, 'dst', dstPath);
}

function setFlowEdgeText(api, nodePath, spec) {
  if (Object.prototype.hasOwnProperty.call(spec, 'label')) api.setAttribute(nodePath, 'label', spec.label || '');
  if (Object.prototype.hasOwnProperty.call(spec, 'lineStyle')) api.setAttribute(nodePath, 'lineStyle', spec.lineStyle || '');
}

function createSubgraph(api, parentPath, spec) {
  return api.createChild(parentPath, 'Subgraph', {
    name: spec.name,
    label: spec.label || '',
    direction: spec.direction || ''
  });
}

function setSubgraphText(api, nodePath, spec) {
  if (Object.prototype.hasOwnProperty.call(spec, 'name')) api.setAttribute(nodePath, 'name', spec.name);
  if (Object.prototype.hasOwnProperty.call(spec, 'label')) api.setAttribute(nodePath, 'label', spec.label || '');
  if (Object.prototype.hasOwnProperty.call(spec, 'direction')) api.setAttribute(nodePath, 'direction', spec.direction || '');
}

function deleteFlowElement(api, nodePath) {
  api.deleteNode(nodePath);
}

function setFlowDirection(api, nodePath, direction) {
  api.setAttribute(nodePath, 'direction', direction);
}

function setFlowTitle(api, nodePath, title) {
  api.setAttribute(nodePath, 'title', title);
}

function placeFlowElement(api, nodePath, index) {
  api.setAttribute(nodePath, 'order', index);
}

function parentPathAt(lines, index, diagramPath) {
  const stack = [diagramPath || null];
  const limit = Math.min(index, lines.length);
  for (let i = 0; i < limit; i += 1) {
    const kind = classifyFlowLine(lines[i].text);
    if (kind.kind === 'subgraph') stack.push(lines[i].nodePath || stack[stack.length - 1]);
    else if (kind.kind === 'end' && stack.length > 1) stack.pop();
  }
  return stack[stack.length - 1];
}

function remember(index, name, nodePath) {
  if (name && nodePath) index.set(name, nodePath);
}

function seedIndex(lines) {
  const index = new Map();
  lines.forEach((line) => {
    const kind = classifyFlowLine(line.text);
    if ((kind.kind === 'node' || kind.kind === 'subgraph') && line.nodePath) {
      remember(index, kind.name, line.nodePath);
    }
  });
  return index;
}

function ensureEndpoint(api, index, decl, parentPath) {
  if (!decl || !decl.name) return null;
  if (index.has(decl.name)) return index.get(decl.name);
  const nodePath = createFlowNode(api, parentPath, decl);
  remember(index, decl.name, nodePath);
  return nodePath;
}

function sameNode(before, after) {
  return before.name === after.name && before.label === after.label && before.shape === after.shape;
}

function onAddLine(api, index, op, parentPath, bindings) {
  const kind = classifyFlowLine(op.text);
  switch (kind.kind) {
    case 'header':
      setFlowDirection(api, parentPath, kind.direction);
      return null;
    case 'title':
      setFlowTitle(api, parentPath, kind.title);
      return null;
    case 'node': {
      const nodePath = createFlowNode(api, parentPath, kind);
      remember(index, kind.name, nodePath);
      bindings.push({ lineId: op.lineId, nodePath });
      return nodePath;
    }
    case 'edge': {
      const srcPath = ensureEndpoint(api, index, kind.srcDecl, parentPath);
      const dstPath = ensureEndpoint(api, index, kind.dstDecl, parentPath);
      const nodePath = createFlowEdge(api, parentPath, {
        name: op.lineId,
        label: kind.label,
        lineStyle: kind.lineStyle,
        srcPath,
        dstPath
      });
      bindings.push({ lineId: op.lineId, nodePath });
      return nodePath;
    }
    case 'subgraph': {
      const nodePath = createSubgraph(api, parentPath, kind);
      remember(index, kind.name, nodePath);
      bindings.push({ lineId: op.lineId, nodePath });
      return nodePath;
    }
    default:
      return null;
  }
}

function noteFlowNames(text, live) {
  const kind = classifyFlowLine(text);
  if ((kind.kind === 'node' || kind.kind === 'subgraph') && kind.name) live.add(kind.name);
  if (kind.kind === 'edge') {
    if (kind.src) live.add(kind.src);
    if (kind.dst) live.add(kind.dst);
  }
}

function onRemoveLine(api, index, beforeLine) {
  if (!beforeLine) return;
  const kind = classifyFlowLine(beforeLine.text);
  if (kind.kind !== 'node' && kind.kind !== 'edge' && kind.kind !== 'subgraph') return;
  dropUnindexed(api, index, beforeLine.nodePath);
}

function onUpdateText(api, index, beforeLine, op, parentPath, bindings) {
  const before = classifyFlowLine(beforeLine ? beforeLine.text : '');
  const after = classifyFlowLine(op.text);
  const nodePath = (beforeLine && beforeLine.nodePath) || op.nodePath || null;
  if (before.kind !== after.kind) {
    dropUnindexed(api, index, nodePath);
    return onAddLine(api, index, op, parentPath, bindings);
  }
  switch (after.kind) {
    case 'header':
      if (before.direction !== after.direction) setFlowDirection(api, parentPath, after.direction);
      return null;
    case 'title':
      if (before.title !== after.title) setFlowTitle(api, parentPath, after.title);
      return null;
    case 'node':
      if (!nodePath) return onAddLine(api, index, op, parentPath, bindings);
      if (!sameNode(before, after)) {
        const changed = {};
        if (before.name !== after.name) changed.name = after.name;
        if (before.label !== after.label) changed.label = after.label;
        if (before.shape !== after.shape) changed.shape = after.shape;
        setFlowNodeText(api, nodePath, changed);
        if (before.name !== after.name) {
          index.delete(before.name);
          remember(index, after.name, nodePath);
        }
      }
      return nodePath;
    case 'edge':
      if (!nodePath) return onAddLine(api, index, op, parentPath, bindings);
      if (before.src !== after.src || before.dst !== after.dst) {
        setFlowEdgeEnds(
          api,
          nodePath,
          ensureEndpoint(api, index, after.srcDecl, parentPath),
          ensureEndpoint(api, index, after.dstDecl, parentPath)
        );
      }
      if (before.label !== after.label || before.lineStyle !== after.lineStyle) {
        const changed = {};
        if (before.label !== after.label) changed.label = after.label;
        if (before.lineStyle !== after.lineStyle) changed.lineStyle = after.lineStyle;
        setFlowEdgeText(api, nodePath, changed);
      }
      return nodePath;
    case 'subgraph':
      if (!nodePath) return onAddLine(api, index, op, parentPath, bindings);
      if (before.name !== after.name || before.label !== after.label || before.direction !== after.direction) {
        const changed = {};
        if (before.name !== after.name) changed.name = after.name;
        if (before.label !== after.label) changed.label = after.label;
        if (before.direction !== after.direction) changed.direction = after.direction;
        setSubgraphText(api, nodePath, changed);
        if (before.name !== after.name) {
          index.delete(before.name);
          remember(index, after.name, nodePath);
        }
      }
      return nodePath;
    default:
      return null;
  }
}

function onMoveLine(api, line) {
  if (line && line.nodePath) placeFlowElement(api, line.nodePath, line.index);
}

function applyWorking(working, op, nodePath) {
  if (op.op === 'removeLine') {
    const at = working.findIndex((line) => line.id === op.lineId);
    if (at >= 0) working.splice(at, 1);
    return;
  }
  if (op.op === 'addLine') {
    working.splice(op.index, 0, {
      id: op.lineId,
      text: op.text,
      nodePath: nodePath || null
    });
    return;
  }
  const current = working.find((line) => line.id === op.lineId);
  if (!current) return;
  current.text = op.text;
  if (nodePath) current.nodePath = nodePath;
  if (op.op === 'moveLine') {
    const at = working.findIndex((line) => line.id === op.lineId);
    const [line] = working.splice(at, 1);
    working.splice(op.index, 0, line);
  }
}

/**
 * @param {{ diagramNodePath?: string, lines?: Array<{id: string, text: string, nodePath?: string|null}> }} baseline
 * @param {Array<object>} lineOperations
 * @param {object} api model transactions: createChild, setAttribute, setPointer, deleteNode
 * @returns {{ steps: Array<object>, bindings: Array<{lineId: string, nodePath: string}>, names: Object<string, string> }}
 */
function walkFlowchartUpdate(baseline, lineOperations, api) {
  const source = baseline || {};
  const working = (source.lines || []).map((line) => ({
    id: line.id,
    text: line.text,
    nodePath: line.nodePath || null
  }));
  const names = seedIndex(working);
  Object.entries(source.names || {}).forEach(([name, nodePath]) => {
    if (name && nodePath && !names.has(name)) names.set(name, nodePath);
  });
  const bindings = [];
  const steps = api;
  (lineOperations || []).forEach((op) => {
    const beforeLine = working.find((line) => line.id === op.lineId) || null;
    let nodePath = null;
    switch (op.op) {
      case 'addLine':
        nodePath = onAddLine(
          steps,
          names,
          op,
          parentPathAt(working, op.index, source.diagramNodePath),
          bindings
        );
        break;
      case 'removeLine':
        onRemoveLine(steps, names, beforeLine);
        break;
      case 'updateText':
        nodePath = onUpdateText(
          steps,
          names,
          beforeLine,
          op,
          parentPathAt(working, beforeLine ? working.indexOf(beforeLine) : op.index, source.diagramNodePath),
          bindings
        );
        break;
      case 'moveLine':
        onMoveLine(steps, Object.assign({}, beforeLine, { index: op.index }));
        break;
      default:
        break;
    }
    applyWorking(working, op, nodePath);
  });
  const live = new Set();
  working.forEach((line) => noteFlowNames(line.text, live));
  releaseUnreferenced(api, names, live);
  return {
    steps: steps.steps || [],
    bindings,
    names: Object.fromEntries(names)
  };
}

module.exports = {
  classifyFlowLine,
  walkFlowchartUpdate,
  createFlowNode,
  setFlowNodeText,
  createFlowEdge,
  setFlowEdgeEnds,
  setFlowEdgeText,
  createSubgraph,
  setSubgraphText,
  deleteFlowElement,
  setFlowDirection,
  setFlowTitle,
  placeFlowElement
};
