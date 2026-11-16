/**
 * Options that change how one diagram type is applied.
 *
 * The settings menu lists these for the diagram that is open. A type with no
 * entries hides that menu. Kanban lines are identified by position, so it
 * has no option that would join two lines by their text.
 */

export const DIAGRAM_OPTIONS = {};

export function optionsForDiagram(diagramType) {
  const list = DIAGRAM_OPTIONS[diagramType];
  return list ? list.slice() : [];
}
