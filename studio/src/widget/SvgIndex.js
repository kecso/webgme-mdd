/**
 * Build a map from diagram element ids → SVG graphics elements for overlay hit boxes.
 * Diagram-specific heuristics; imperfect for ishikawa/packet — see findings.
 */

/**
 * @typedef {object} IndexedElement
 * @property {string} modelId
 * @property {Element} el
 * @property {DOMRect} bbox
 */

/**
 * @param {SVGSVGElement|null} svg
 * @param {string} domainId
 * @returns {IndexedElement[]}
 */
export function buildSvgIndex(svg, domainId) {
  if (!svg) return [];

  const out = [];
  const seen = new Set();

  const push = (modelId, el) => {
    if (!modelId || seen.has(modelId)) return;
    try {
      const bbox = el.getBoundingClientRect();
      if (bbox.width < 1 && bbox.height < 1) return;
      seen.add(modelId);
      out.push({ modelId, el, bbox });
    } catch {
      /* detached */
    }
  };

  // Prefer data-id on interactive-ish nodes
  svg.querySelectorAll('[data-id]').forEach((el) => {
    const et = el.getAttribute('data-et') || '';
    if (et === 'edge' || el.getAttribute('data-edge') === 'true') {
      push(`edge:${el.getAttribute('data-id')}`, el);
      return;
    }
    if (et === 'message') {
      push(`message:${el.getAttribute('data-id')}`, el);
      return;
    }
    if (et === 'participant') {
      push(`participant:${el.getAttribute('data-id')}`, el);
      return;
    }
    push(el.getAttribute('data-id'), el);
  });

  // Node groups with prefixed ids: …-flowchart-A-0, …-classId-Foo-1, …-service-web
  svg.querySelectorAll('g.node, g[id], .node, .actor, .c4-shape').forEach((el) => {
    const id = el.getAttribute('id') || '';
    const modelId = parseModelIdFromSvgId(id, domainId);
    if (modelId) push(modelId, el);
  });

  return out;
}

/**
 * @param {string} svgId
 * @param {string} domainId
 * @returns {string|null}
 */
export function parseModelIdFromSvgId(svgId, domainId) {
  if (!svgId) return null;
  const patterns = [
    /-flowchart-([A-Za-z0-9_]+)-\d+$/,
    /-classId-([A-Za-z0-9_]+)-\d+$/,
    /-entity-([A-Za-z0-9_-]+)-\d+$/,
    /-state-([A-Za-z0-9_]+)-\d+$/,
    /-service-([A-Za-z0-9_]+)$/,
    /-group-([A-Za-z0-9_]+)$/,
    /-task(\d+)$/,
    /-([A-Za-z][A-Za-z0-9_]*)-\d+$/
  ];
  for (const re of patterns) {
    const m = svgId.match(re);
    if (m) return m[1].startsWith('task') ? `task${m[1].replace(/^task/, '') || m[1]}` : m[1];
  }
  // architecture / c4 sometimes end with -id
  const bare = svgId.split('-').pop();
  if (bare && bare.length > 1 && !/^\d+$/.test(bare) && domainId === 'c4') return bare;
  return null;
}

/**
 * Map absolute client bbox → coordinates relative to host element.
 * `scale` is the CSS transform scale already applied to the host, so the
 * result is in the host's pre-transform layout pixels.
 * @param {DOMRect} bbox
 * @param {DOMRect} hostBox
 * @param {number} [scale]
 */
export function toHostBox(bbox, hostBox, scale = 1) {
  const s = scale || 1;
  return {
    left: (bbox.left - hostBox.left) / s,
    top: (bbox.top - hostBox.top) / s,
    width: bbox.width / s,
    height: bbox.height / s
  };
}
