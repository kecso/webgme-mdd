/**
 * View-only Mermaid (or EARS list) canvas — WebGME visualizer/widget analogue.
 * Renders projection; SelectionOverlay handles picks → DiagramControl.
 * The SVG sits in a clipped viewport: wheel zooms toward the pointer, drag pans.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import SelectionOverlay from './SelectionOverlay.jsx';
import { buildSvgIndex, toHostBox } from './SvgIndex.js';
import {
  getMermaidSurface,
  setMermaidSurface,
  mermaidInitOptions
} from './mermaidTheme.js';

function TuneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 7h11v2H3V7zm13 0h5v2h-5V7zM3 15h5v2H3v-2zm7 0h11v2H10v-2zM15 5a3 3 0 1 0 .001 6A3 3 0 0 0 15 5zM7 13a3 3 0 1 0 .001 6A3 3 0 0 0 7 13z"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11 2h2v3h-2V2zm0 17h2v3h-2v-3zM2 11h3v2H2v-2zm17 0h3v2h-3v-2zM4.9 4.1l1.4-1.4 2.1 2.1-1.4 1.4L4.9 4.1zm11.7 11.7 1.4-1.4 2.1 2.1-1.4 1.4-2.1-2.1zM19.1 4.1l-2.1 2.1-1.4-1.4 2.1-2.1 1.4 1.4zM7.4 18.8l-2.1 2.1-1.4-1.4 2.1-2.1 1.4 1.4zM12 7a5 5 0 1 0 .001 10A5 5 0 0 0 12 7z"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.5 2.5a8.5 8.5 0 1 0 7 12.2 7 7 0 0 1-7-12.2z"
      />
    </svg>
  );
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 5;
const IDENTITY_VIEW = { scale: 1, x: 0, y: 0 };
const LOCAL_HOST_BOX = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  right: 0,
  bottom: 0,
  x: 0,
  y: 0,
  toJSON() {
    return this;
  }
};

function clampScale(scale) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Keep the diagram point under (clientX, clientY) fixed while the scale changes. */
function zoomAtPoint(view, rect, clientX, clientY, nextScale) {
  const scale = clampScale(nextScale);
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  const stageX = (px - view.x) / view.scale;
  const stageY = (py - view.y) / view.scale;
  return {
    scale,
    x: px - stageX * scale,
    y: py - stageY * scale
  };
}

/**
 * @param {object} props
 * @param {string} [props.diagramKey]
 * @param {string} props.domainId
 * @param {string} props.source
 * @param {import('../control/DiagramControl.js').DiagramControl} props.control
 * @param {string|null} props.selectedId
 * @param {(id: string|null) => void} props.onSelectedId
 */
export default function DiagramCanvas({
  diagramKey,
  domainId,
  source,
  control,
  selectedId,
  onSelectedId
}) {
  const hostRef = useRef(null);
  const viewportRef = useRef(null);
  const toolsRef = useRef(null);
  const viewRef = useRef(IDENTITY_VIEW);
  const dragRef = useRef(null);
  const movedRef = useRef(false);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState([]);
  const [hostBox, setHostBox] = useState(null);
  const [surface, setSurface] = useState(() => getMermaidSurface());
  const [view, setView] = useState(IDENTITY_VIEW);
  const [panning, setPanning] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const renderGen = useRef(0);

  viewRef.current = view;

  const rebuildIndex = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const svg = host.querySelector('svg');
    const hostRect = host.getBoundingClientRect();
    const scale = viewRef.current.scale || 1;
    const items = buildSvgIndex(svg, domainId).map((item) => {
      const local = toHostBox(item.bbox, hostRect, scale);
      return {
        ...item,
        bbox: {
          ...local,
          right: local.left + local.width,
          bottom: local.top + local.height,
          x: local.left,
          y: local.top,
          toJSON() {
            return this;
          }
        }
      };
    });
    setHostBox(items.length ? LOCAL_HOST_BOX : null);
    setIndex(items);
  }, [domainId]);

  useEffect(() => {
    mermaid.initialize(mermaidInitOptions(surface));
  }, [surface]);

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
        mermaid.initialize(mermaidInitOptions(surface));
        const id = `studio-${domainId}-${Date.now()}`;
        const { svg } = await mermaid.render(
          id,
          source || 'flowchart TD\n  Empty[Empty diagram]'
        );
        if (cancelled || gen !== renderGen.current) return;
        if (hostRef.current) {
          hostRef.current.innerHTML = svg;
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
  }, [source, domainId, surface, rebuildIndex]);

  useEffect(() => {
    setView(IDENTITY_VIEW);
    setToolsOpen(false);
  }, [diagramKey]);

  useEffect(() => {
    if (!toolsOpen) return undefined;
    const onPointer = (event) => {
      if (!toolsRef.current?.contains(event.target)) setToolsOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setToolsOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [toolsOpen]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || domainId === 'ears') return undefined;
    const onWheel = (event) => {
      event.preventDefault();
      const line = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientHeight : 1;
      const factor = Math.exp(-event.deltaY * line * 0.0015);
      const rect = el.getBoundingClientRect();
      setView((current) =>
        zoomAtPoint(current, rect, event.clientX, event.clientY, current.scale * factor)
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    const observer = new ResizeObserver(() => rebuildIndex());
    observer.observe(el);
    return () => {
      el.removeEventListener('wheel', onWheel);
      observer.disconnect();
    };
  }, [domainId, rebuildIndex]);

  const toggleSurface = () => {
    const next = surface === 'light' ? 'dark' : 'light';
    setMermaidSurface(next);
    setSurface(next);
  };

  if (domainId === 'ears') {
    return (
      <EarsView
        source={source}
        selectedId={selectedId}
        onSelect={onSelectedId}
        control={control}
      />
    );
  }

  const zoomBy = (factor) => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setView((current) =>
      zoomAtPoint(
        current,
        rect,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        current.scale * factor
      )
    );
  };

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('.hit, button, a')) return;
    movedRef.current = false;
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originX: view.x,
      originY: view.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 4) {
      movedRef.current = true;
      setPanning(true);
    }
    setView((current) => ({
      ...current,
      x: drag.originX + dx,
      y: drag.originY + dy
    }));
  };

  const onPointerUp = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    setPanning(false);
  };

  return (
    <div className={`diagram-canvas surface-${surface}`}>
      {error ? <div className="canvas-error">{error}</div> : null}
      <div
        className={`diagram-viewport${panning ? ' is-panning' : ''}`}
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Diagram. Scroll to zoom, drag to move."
      >
        <div
          className="diagram-stage"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
          }}
        >
          <div
            className="mermaid-host"
            ref={hostRef}
            onClick={() => {
              if (movedRef.current) {
                movedRef.current = false;
                return;
              }
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
        </div>
      </div>
      <div className="canvas-tools" ref={toolsRef}>
        {toolsOpen ? (
          <div className="canvas-tools-panel" role="group" aria-label="Diagram view">
            <div className="zoom-controls">
              <button
                type="button"
                className="btn tiny"
                onClick={() => zoomBy(1 / 1.2)}
                title="Zoom out"
              >
                −
              </button>
              <button
                type="button"
                className="btn tiny"
                onClick={() => setView(IDENTITY_VIEW)}
                title="Reset zoom and position"
              >
                {Math.round(view.scale * 100)}%
              </button>
              <button
                type="button"
                className="btn tiny"
                onClick={() => zoomBy(1.2)}
                title="Zoom in"
              >
                +
              </button>
            </div>
            <span className="canvas-tools-sep" aria-hidden />
            <button
              type="button"
              className="btn tiny canvas-theme"
              onClick={toggleSurface}
              title={surface === 'light' ? 'Dark diagram' : 'Light diagram'}
              aria-label={surface === 'light' ? 'Dark diagram' : 'Light diagram'}
            >
              {surface === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className="canvas-tools-fab"
          aria-label="Diagram view"
          aria-expanded={toolsOpen}
          title="Zoom and diagram theme"
          onClick={() => setToolsOpen((open) => !open)}
        >
          <TuneIcon />
        </button>
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
