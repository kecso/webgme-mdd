'use strict';

/**
 * Kanban update walker.
 *
 * Needs further design/specification.
 *
 * A card line is indented under a column, but Column does not contain Ticket
 * and Ticket has no column pointer. The indented line cannot be stored in its
 * column. No model transactions are emitted.
 */

const REASON = 'A card is indented under a column, but Column does not contain Ticket and Ticket has no column, so the card cannot be stored in its column. Needs further design/specification.';

function walkKanbanUpdate() {
  return {
    status: 'needs-design',
    reason: REASON,
    steps: [],
    bindings: [],
    names: {},
    skipped: []
  };
}

module.exports = {
  walkKanbanUpdate,
  REASON
};
