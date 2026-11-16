'use strict';

/**
 * Block diagram update walker.
 *
 * Needs further design/specification.
 *
 * block-beta puts several blocks on one line (`Catalog Catalog Catalog`) and
 * also uses that line for width and columns. One line operation is then more
 * than one block, so there is no single node to bind back onto the line.
 * An edge such as `Catalog --> Meta` is one connector, but the blocks it would
 * join are not one-line elements. No model transactions are emitted, so there
 * are no named elements to release when a line disappears.
 */

const REASON = 'A block-beta row lists several blocks on one line, so one line operation is not one block. Needs further design/specification.';

function walkBlockUpdate() {
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
  walkBlockUpdate,
  REASON
};
