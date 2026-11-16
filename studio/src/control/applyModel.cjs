'use strict';

/**
 * Commit one Apply as one WebGME transaction.
 *
 * The walkers stay the only readers of a line. This records the model calls
 * they make, then replays that list inside a single startTransaction /
 * completeTransaction together with the diagram source. The server receives
 * one commit. Bindings and the name index are written back onto the diagram
 * so the next Apply updates those nodes.
 *
 * A diagram whose lines do not yet point at nodes is created from the text
 * those lines already have: each line is an addLine. Lines that already have
 * a node are left to the edit's own operations.
 *
 * Block stays needs-design. Its walker emits no model calls.
 * The source is still saved in that same transaction.
 *
 * Mermaid parses the current lines first. Text it rejects throws before a
 * transaction starts, so none of it is written.
 */

const { walkDiagramUpdate } = require('./diagramWalkers.cjs');
const { checkDiagram } = require('./diagramCheck.cjs');
const {
  SOURCE_ATTRIBUTE,
  LINE_NODES_ATTRIBUTE,
  LINE_NAMES_ATTRIBUTE,
  loadNode
} = require('./diagramNode.cjs');

const NEW_PATH = '/$apply/';
const CHILD_DEPTH = 5;

function sessionHasLinks(session) {
  return (session && session.lines || []).some((line) => line && line.nodePath);
}

function inputForApply(session, folded) {
  const source = session || {};
  const after = (folded && folded.lines) || [];
  if (!sessionHasLinks(source)) {
    return {
      baseline: {
        diagramNodePath: source.diagramNodePath || null,
        lines: [],
        names: {}
      },
      operations: after.map((line, index) => ({
        op: 'addLine',
        lineId: line.id,
        nodePath: null,
        text: line.text,
        index
      }))
    };
  }
  return {
    baseline: {
      diagramNodePath: source.diagramNodePath || null,
      lines: source.lines || [],
      names: source.names || {}
    },
    operations: (folded && folded.operations) || []
  };
}

function recordingApi() {
  const steps = [];
  let next = 0;
  return {
    steps,
    createChild(parentPath, baseName, attributes) {
      const path = NEW_PATH + (++next);
      const copy = {};
      Object.keys(attributes || {}).forEach((key) => {
        copy[key] = attributes[key];
      });
      steps.push({
        op: 'createChild',
        parentPath: parentPath || null,
        baseName,
        attributes: copy,
        path
      });
      return path;
    },
    setAttribute(nodePath, name, value) {
      steps.push({ op: 'setAttribute', nodePath, name, value });
    },
    setPointer(nodePath, name, targetPath) {
      steps.push({ op: 'setPointer', nodePath, name, targetPath: targetPath || null });
    },
    deleteNode(nodePath) {
      steps.push({ op: 'deleteNode', nodePath });
    },
    delAttribute(nodePath, name) {
      steps.push({ op: 'delAttribute', nodePath, name });
    },
    moveNode(nodePath, parentPath) {
      const path = NEW_PATH + 'move/' + (++next);
      steps.push({ op: 'moveNode', nodePath, parentPath, path });
      return path;
    }
  };
}

function planDiagramUpdate(diagramType, baseline, lineOperations) {
  const api = recordingApi();
  const result = walkDiagramUpdate(diagramType, baseline, lineOperations, api);
  return {
    status: result.status,
    reason: result.reason || '',
    skipped: result.skipped || [],
    steps: api.steps,
    bindings: result.bindings || [],
    names: result.names || {}
  };
}

function isNewPath(path) {
  return typeof path === 'string' && path.startsWith(NEW_PATH);
}

function translatePath(path, map) {
  if (!path) return path || null;
  return map.has(path) ? map.get(path) : path;
}

function assignLinePaths(lines, bindings) {
  const byId = new Map((bindings || []).map((item) => [item.lineId, item.nodePath]));
  return (lines || []).map((line) => ({
    id: line.id,
    text: line.text,
    nodePath: byId.has(line.id) ? byId.get(line.id) : (line.nodePath || null)
  }));
}

function translatePlan(plan, map) {
  const bindings = (plan.bindings || []).map((item) => ({
    lineId: item.lineId,
    nodePath: translatePath(item.nodePath, map)
  }));
  const names = {};
  Object.entries(plan.names || {}).forEach(([name, path]) => {
    names[name] = translatePath(path, map);
  });
  return {
    status: plan.status,
    reason: plan.reason || '',
    skipped: plan.skipped || [],
    bindings,
    names
  };
}

function metaBases(client, diagramType) {
  const bases = {};
  (client.getAllMetaNodes() || []).forEach((node) => {
    if (!node || node.getNamespace() !== diagramType) return;
    const name = node.getAttribute('name');
    if (name && node.getId()) bases[name] = node.getId();
  });
  return bases;
}

function assertReady(client, plan, diagramNodePath) {
  if (plan.status !== 'applied') return;
  const orphan = (plan.steps || []).find((step) => step.op === 'createChild' && !step.parentPath);
  if (orphan) throw new Error('No parent for a new ' + orphan.baseName + '.');
  const needed = new Set([diagramNodePath]);
  (plan.steps || []).forEach((step) => {
    const paths = [];
    if (step.op === 'createChild') paths.push(step.parentPath);
    if (step.op === 'setAttribute' || step.op === 'deleteNode' || step.op === 'delAttribute') {
      paths.push(step.nodePath);
    }
    if (step.op === 'moveNode') paths.push(step.nodePath, step.parentPath);
    if (step.op === 'setPointer') paths.push(step.nodePath, step.targetPath);
    paths.forEach((path) => {
      if (path && !isNewPath(path)) needed.add(path);
    });
  });
  const missing = [...needed].filter((path) => !client.getNode(path));
  if (missing.length) {
    throw new Error('These model nodes are not loaded: ' + missing.join(', '));
  }
}

function replayPlan(client, spec, plan, bases) {
  return new Promise((resolve, reject) => {
    const map = new Map();
    const real = (path) => translatePath(path, map);
    let failed = null;
    let opened = false;
    const finish = (err) => {
      if (err || failed) reject(err || failed);
      else {
        const translated = translatePlan(plan, map);
        const lines = assignLinePaths(spec.lines, translated.bindings);
        resolve(Object.assign({}, translated, {
          lines,
          lineNodes: lines.map((line) => line.nodePath)
        }));
      }
    };
    try {
      client.startTransaction('apply ' + spec.diagramType);
      opened = true;
      if (plan.status === 'applied') {
        plan.steps.forEach((step) => {
          if (failed) return;
          if (step.op === 'createChild') {
            const baseId = bases[step.baseName];
            const parentId = real(step.parentPath);
            if (!baseId) {
              failed = new Error(step.baseName + ' is not in the ' + spec.diagramType + ' language.');
              return;
            }
            const id = client.createNode({
              parentId,
              baseId
            }, {
              attributes: step.attributes
            });
            if (!id) {
              failed = new Error('WebGME did not create ' + step.baseName + '.');
              return;
            }
            map.set(step.path, id);
            return;
          }
          if (step.op === 'setAttribute') {
            client.setAttribute(real(step.nodePath), step.name, step.value);
            return;
          }
          if (step.op === 'setPointer') {
            client.setPointer(real(step.nodePath), step.name, step.targetPath ? real(step.targetPath) : null);
            return;
          }
          if (step.op === 'delAttribute') {
            client.delAttribute(real(step.nodePath), step.name);
            return;
          }
          if (step.op === 'moveNode') {
            const moved = client.moveNode(real(step.nodePath), real(step.parentPath));
            if (moved) map.set(step.path, moved);
            return;
          }
          if (step.op === 'deleteNode') client.deleteNode(real(step.nodePath));
        });
      }
      client.setAttribute(spec.diagramNodePath, SOURCE_ATTRIBUTE, spec.source);
      if (plan.status === 'applied') {
        const translated = translatePlan(plan, map);
        const lines = assignLinePaths(spec.lines, translated.bindings);
        client.setAttribute(spec.diagramNodePath, LINE_NODES_ATTRIBUTE, JSON.stringify(lines.map((line) => line.nodePath)));
        client.setAttribute(spec.diagramNodePath, LINE_NAMES_ATTRIBUTE, JSON.stringify(translated.names));
      }
      client.completeTransaction('Apply ' + spec.diagramType, finish);
    } catch (err) {
      if (!opened) {
        reject(err);
        return;
      }
      failed = failed || err;
      try {
        client.completeTransaction('Apply ' + spec.diagramType + ' failed', finish);
      } catch (closeErr) {
        reject(failed);
      }
    }
  });
}

async function commitDiagramUpdate(client, spec) {
  if (!client || typeof client.startTransaction !== 'function') {
    throw new Error('WebGME is not connected');
  }
  if (!spec || !spec.diagramNodePath) {
    throw new Error('This diagram has no WebGME node to update.');
  }
  const verdict = await checkDiagram(spec.diagramType, spec.source != null ? spec.source : spec.lines);
  if (!verdict.ok) throw new Error(verdict.message);
  await loadNode(client, spec.diagramNodePath, CHILD_DEPTH);
  if (!client.getNode(spec.diagramNodePath)) {
    throw new Error('Diagram node ' + spec.diagramNodePath + ' is not loaded');
  }
  const bases = metaBases(client, spec.diagramType);
  const plan = planDiagramUpdate(spec.diagramType, spec.baseline, spec.lineOperations);
  if (plan.status === 'applied') {
    const missing = [...new Set(
      plan.steps
        .filter((step) => step.op === 'createChild' && !bases[step.baseName])
        .map((step) => step.baseName)
    )];
    if (missing.length) {
      throw new Error(missing.join(', ') + ' is not in the ' + spec.diagramType + ' language.');
    }
  }
  assertReady(client, plan, spec.diagramNodePath);
  return replayPlan(client, spec, plan, bases);
}

module.exports = {
  sessionHasLinks,
  inputForApply,
  planDiagramUpdate,
  assignLinePaths,
  commitDiagramUpdate
};
