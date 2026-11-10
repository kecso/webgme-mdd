/**
 * View-only Mermaid (or EARS list) canvas — WebGME visualizer/widget analogue.
 * Renders projection; SelectionOverlay handles picks → DiagramControl.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import SelectionOverlay from './SelectionOverlay.jsx';
import { buildSvgIndex } from './SvgIndex.js';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'neutral'
});

/**
 * @param {object} props
 * @param {string} props.domainId
 * @param {string} props.source
 * @param {import('../control/DiagramControl.js').DiagramControl} props.control
 * @param {string|null} props.selectedId
 * @param {(id: string|null) => void} props.onSelectedId
 */
export default function DiagramCanvas({
  domainId,
  source,
  control,
  selectedId,
  onSelectedId
}) {
  const hostRef = useRef(null);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState([]);
  const [hostBox, setHostBox] = useState(null);
  const renderGen = useRef(0);

  const rebuildIndex = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const svg = host.querySelector('svg');
    setHostBox(host.getBoundingClientRect());
    setIndex(buildSvgIndex(svg, domainId));
  }, [domainId]);

  useEffect(() => {
    if (domainId === 'ears') {
      setError(null);
      setIndex([]);
      return;
    }

    const gen = ++renderGen.current;
    let cancelled = false;

    (async () => {
      setError(null);
      try {
        const id = `studio-${domainId}-${Date.now()}`;
        const { svg } = await mermaid.render(id, source || 'flowchart TD\n  Empty[Empty diagram]');
        if (cancelled || gen !== renderGen.current) return;
        if (hostRef.current) {
          hostRef.current.innerHTML = svg;
          // Do not call bindFunctions — view-only; overlay owns interaction.
          requestAnimationFrame(() => rebuildIndex());
        }
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || String(err));
        if (hostRef.current) hostRef.current.innerHTML = '';
        setIndex([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, domainId, rebuildIndex]);

  useEffect(() => {
    const onResize = () => rebuildIndex();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [rebuildIndex]);

  if (domainId === 'ears') {
    return <EarsView source={source} selectedId={selectedId} onSelect={onSelectedId} control={control} />;
  }

  return (
    <div className="diagram-canvas">
      {error ? <div className="canvas-error">{error}</div> : null}
      <div
        className="mermaid-host"
        ref={hostRef}
        onClick={() => {
          onSelectedId(null);
          control.selectElement(null);
        }}
      />
      <SelectionOverlay
        index={index}
        hostBox={hostBox}
        selectedId={selectedId}
        enabled={!error}
        onSelect={(id) => {
          onSelectedId(id);
          control.selectElement(id);
        }}
      />
      <div className="canvas-meta">
        <span>{index.length} indexed elements</span>
        {/* TODO(widget): pan/zoom (svg-pan-zoom) sharing transform with overlay */}
      </div>
    </div>
  );
}

function EarsView({ source, selectedId, onSelect, control }) {
  const lines = String(source || '')
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const reqs = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^(REQ[\w.-]+)/i);
    if (!m) continue;
    const body = lines[i + 1] && !/^REQ/i.test(lines[i + 1]) ? lines[i + 1] : '';
    reqs.push({ id: m[1], header: lines[i], body });
  }

  return (
    <div className="ears-view">
      <p className="hint">EARS companion — list view (not Mermaid SVG).</p>
      <ul>
        {reqs.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className={selectedId === r.id ? 'selected' : ''}
              onClick={() => {
                onSelect(r.id);
                control.selectElement(r.id);
              }}
            >
              <strong>{r.id}</strong>
              <span>{r.body || r.header}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
