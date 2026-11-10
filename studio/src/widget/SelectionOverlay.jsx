/**
 * Transparent overlay over the Mermaid SVG — the interaction "widget" surface.
 * Does not mutate layout; reports selection intents to DiagramControl.
 */
import React, { useMemo } from 'react';
import { toHostBox } from './SvgIndex.js';

/**
 * @param {object} props
 * @param {import('./SvgIndex.js').IndexedElement[]} props.index
 * @param {DOMRect|null} props.hostBox
 * @param {string|null} props.selectedId
 * @param {(id: string) => void} props.onSelect
 * @param {boolean} [props.enabled]
 */
export default function SelectionOverlay({
  index,
  hostBox,
  selectedId,
  onSelect,
  enabled = true
}) {
  const boxes = useMemo(() => {
    if (!enabled || !hostBox) return [];
    return index.map((item) => ({
      modelId: item.modelId,
      ...toHostBox(item.bbox, hostBox)
    }));
  }, [index, hostBox, enabled]);

  if (!enabled) return null;

  return (
    <div className="selection-overlay" aria-hidden={false}>
      {boxes.map((b) => (
        <button
          key={b.modelId}
          type="button"
          className={`hit${selectedId === b.modelId ? ' selected' : ''}`}
          title={b.modelId}
          style={{
            left: b.left,
            top: b.top,
            width: Math.max(b.width, 8),
            height: Math.max(b.height, 8)
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(b.modelId);
          }}
        />
      ))}
      {/* TODO(widget): rubber-band multi-select; hover tooltips; Integrating link badges */}
    </div>
  );
}
