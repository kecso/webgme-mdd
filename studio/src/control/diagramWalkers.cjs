'use strict';

/**
 * Dispatch a diagram's line operations to its walker.
 *
 * Block is marked needs further design/specification. A block row lists
 * several blocks, so one line is not one element. Kanban columns contain
 * their tickets. Each column line and each ticket line is its own element.
 */

const { walkFlowchartUpdate } = require('./flowchartUpdate.cjs');
const { walkSequenceUpdate } = require('./sequenceUpdate.cjs');
const { walkStateUpdate } = require('./stateUpdate.cjs');
const { walkClassUpdate } = require('./classUpdate.cjs');
const { walkErUpdate } = require('./erUpdate.cjs');
const { walkEarsUpdate } = require('./earsUpdate.cjs');
const { walkRequirementUpdate } = require('./requirementUpdate.cjs');
const { walkC4Update } = require('./c4Update.cjs');
const { walkArchitectureUpdate } = require('./architectureUpdate.cjs');
const { walkUsecaseUpdate } = require('./usecaseUpdate.cjs');
const { walkGanttUpdate } = require('./ganttUpdate.cjs');
const { walkBlockUpdate } = require('./blockUpdate.cjs');
const { walkKanbanUpdate } = require('./kanbanUpdate.cjs');

const WALKERS = {
  flowchart: walkFlowchartUpdate,
  sequence: walkSequenceUpdate,
  state: walkStateUpdate,
  class: walkClassUpdate,
  er: walkErUpdate,
  ears: walkEarsUpdate,
  requirement: walkRequirementUpdate,
  c4: walkC4Update,
  architecture: walkArchitectureUpdate,
  usecase: walkUsecaseUpdate,
  gantt: walkGanttUpdate,
  block: walkBlockUpdate,
  kanban: walkKanbanUpdate
};

function walkDiagramUpdate(diagramType, baseline, lineOperations, api) {
  const walk = WALKERS[diagramType];
  if (!walk) {
    return {
      status: 'unsupported',
      reason: 'No walker for ' + diagramType,
      steps: [],
      bindings: [],
      names: {},
      skipped: []
    };
  }
  const result = walk(baseline, lineOperations, api);
  if (result.status) return result;
  return Object.assign({ status: 'applied', skipped: [] }, result);
}

module.exports = {
  WALKERS,
  walkDiagramUpdate
};
