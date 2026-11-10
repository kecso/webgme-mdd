import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import ProjectOverview from '../components/ProjectOverview.jsx';
import NewDiagramFab from '../components/NewDiagramFab.jsx';
import Inspector from '../components/Inspector.jsx';
import DiagramCanvas from '../widget/DiagramCanvas.jsx';
import SourceEditorPanel from '../monaco/SourceEditorPanel.jsx';
import ProjectSettings from './ProjectSettings.jsx';
import { DiagramControl } from '../control/DiagramControl.js';
import { WebGmeBridge } from '../control/WebGmeBridge.js';
import {
  getProject,
  setDiagramSource,
  upsertProject
} from '../data/demoStore.js';
import {
  couplingsForDomain,
  inferModelingDomain
} from '../data/modelingDomains.js';

export default function ProjectStudio() {
  const { owner, name } = useParams();
  const navigate = useNavigate();
  const projectId = `${owner}+${name}`;

  const [project, setProject] = useState(() => getProject(projectId));
  const [catalog, setCatalog] = useState(null);
  const [mode, setMode] = useState('overview'); // overview | canvas
  const [activeKey, setActiveKey] = useState(null);
  const [viewSource, setViewSource] = useState('');
  const [draftSource, setDraftSource] = useState('');
  const [sourceOpen, setSourceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [log, setLog] = useState([]);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');
  const [userLabel, setUserLabel] = useState('Local demo');

  const pushLog = useCallback((msg) => {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()}  ${msg}`]);
  }, []);

  const controlRef = useRef(null);
  if (!controlRef.current || controlRef.current.projectId !== projectId) {
    controlRef.current = new DiagramControl({
      projectId,
      onLog: pushLog,
      onViewSource: (_key, source) => {
        setViewSource(source);
        setDraftSource(source);
      }
    });
  }
  const control = controlRef.current;

  useEffect(() => {
    WebGmeBridge.connect().then((r) => {
      if (r.user?.displayName) setUserLabel(r.user.displayName);
      pushLog(r.connected ? 'WebGME connected' : 'Demo mode (WebGME bridge TODO)');
    });
    WebGmeBridge.openProject(projectId);
  }, [projectId, pushLog]);

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((cat) => {
        setCatalog(cat);
        // Backfill modelingDomainId on legacy diagram instances
        const p = getProject(projectId);
        if (!p) return;
        let dirty = false;
        Object.values(p.diagrams || {}).forEach((inst) => {
          if (!inst.modelingDomainId && inst.diagramType) {
            inst.modelingDomainId = inferModelingDomain(
              cat,
              inst.diagramType,
              p.enabledModelingDomains
            );
            dirty = true;
          }
        });
        if (dirty) {
          upsertProject(p);
          setProject({ ...p });
        }
      })
      .catch((e) => pushLog(`catalog load failed: ${e.message}`));
  }, [projectId, pushLog]);

  useEffect(() => {
    setProject(getProject(projectId));
    setMode('overview');
    setActiveKey(null);
  }, [projectId]);

  const active = activeKey && project?.diagrams?.[activeKey];
  const diagramType = active?.diagramType || null;
  const dirty = draftSource !== viewSource;

  const ensureSample = useCallback(
    async (diagramTypeId, diagramKey, diagramName, modelingDomainId) => {
      let source = project?.diagrams?.[diagramKey]?.source;
      if (!source) {
        const res = await fetch(`/api/sample/${diagramTypeId}`);
        source = res.ok
          ? await res.text()
          : diagramTypeId === 'ears'
            ? 'REQ-001 [ubiquitous]\nThe system shall start.\n'
            : `flowchart TD\n  A[${diagramName}] --> B[Edit me]`;
        const next = setDiagramSource(projectId, diagramKey, {
          diagramType: diagramTypeId,
          modelingDomainId,
          name: diagramName,
          source
        });
        setProject({ ...next });
      }
      control.setBaseline(diagramKey, source);
      setViewSource(source);
      setDraftSource(source);
      setSelectedId(null);
      setApplyMsg('');
      pushLog(`opened ${diagramKey} (${modelingDomainId || '?'} → ${diagramTypeId})`);
    },
    [project, projectId, control, pushLog]
  );

  const onOpenDiagram = async (key) => {
    setActiveKey(key);
    setMode('canvas');
    const inst = project.diagrams[key];
    if (!inst) return;
    await ensureSample(
      inst.diagramType,
      key,
      inst.name,
      inst.modelingDomainId
    );
  };

  const onCreateDiagram = async ({ modelingDomainId, diagramType: typeId, name: diagramName }) => {
    const enabled = project.enabledModelingDomains || [];
    if (!enabled.includes(modelingDomainId)) {
      pushLog(`create blocked: domain ${modelingDomainId} is not enabled on this project`);
      return;
    }
    const allowed = new Set(
      couplingsForDomain(catalog, modelingDomainId).map((c) => c.diagramType)
    );
    if (!allowed.has(typeId)) {
      pushLog(
        `create blocked: view ${typeId} is not coupled to enabled domain ${modelingDomainId}`
      );
      return;
    }

    const count =
      Object.values(project.diagrams).filter(
        (d) => d.diagramType === typeId && d.modelingDomainId === modelingDomainId
      ).length + 1;
    const finalName = diagramName || `${typeId}-${count}`;
    const key = `${modelingDomainId}:${typeId}:${finalName}`;
    const next = setDiagramSource(projectId, key, {
      modelingDomainId,
      diagramType: typeId,
      name: finalName,
      source: ''
    });
    setProject({ ...next });
    setActiveKey(key);
    setMode('canvas');
    await ensureSample(typeId, key, finalName, modelingDomainId);
    setSourceOpen(true);
  };

  const onApply = async () => {
    if (!activeKey || !diagramType) return;
    setApplyBusy(true);
    try {
      const result = await control.applySource({
        diagramKey: activeKey,
        domainId: diagramType,
        modelingDomainId: active?.modelingDomainId,
        name: active?.name || activeKey,
        source: draftSource
      });
      setProject(getProject(projectId));
      setApplyMsg(result.message || result.status);
    } catch (e) {
      setApplyMsg(e.message || String(e));
    } finally {
      setApplyBusy(false);
    }
  };

  if (!project) {
    return (
      <div className="page">
        <p>Unknown project.</p>
        <Link to="/projects">Back</Link>
      </div>
    );
  }

  const bodyClass = [
    'studio-body',
    mode === 'overview' ? 'overview-mode' : 'canvas-mode',
    sourceOpen && mode === 'canvas' ? 'with-source' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="studio-shell">
      <Header
        project={project}
        mode={mode}
        active={active}
        sourceOpen={sourceOpen}
        onToggleSource={() => setSourceOpen((v) => !v)}
        onOpenSettings={() => setSettingsOpen(true)}
        onShowOverview={() => setMode('overview')}
        onShowCanvas={() => activeKey && setMode('canvas')}
        onExportBook={() => {
          pushLog('opening Markdown book preview');
          navigate(`/p/${owner}/${name}/book`);
        }}
        userLabel={userLabel}
      />
      <div className={bodyClass}>
        <main className="studio-main">
          {mode === 'overview' ? (
            <ProjectOverview
              project={project}
              catalog={catalog}
              activeKey={activeKey}
              onOpenDiagram={onOpenDiagram}
            />
          ) : activeKey && diagramType ? (
            <DiagramCanvas
              domainId={diagramType}
              source={viewSource}
              control={control}
              selectedId={selectedId}
              onSelectedId={setSelectedId}
            />
          ) : (
            <div className="empty-canvas">
              <h2>No diagram open</h2>
              <p>Return to overview, or use + to create a view allowed by enabled domains.</p>
            </div>
          )}
        </main>
        {mode === 'canvas' ? (
          <Inspector
            domainId={diagramType}
            selectedId={selectedId}
            diagramKey={activeKey}
            log={log}
            modelingDomainId={active?.modelingDomainId}
          />
        ) : null}
        {mode === 'canvas' ? (
          <SourceEditorPanel
            open={sourceOpen}
            onClose={() => setSourceOpen(false)}
            domainId={diagramType || 'flowchart'}
            diagramKey={activeKey || '—'}
            draft={draftSource}
            onDraftChange={setDraftSource}
            onApply={onApply}
            applyBusy={applyBusy}
            statusMessage={applyMsg}
            dirty={dirty}
          />
        ) : null}
      </div>

      <NewDiagramFab
        open={fabOpen}
        onOpen={() => setFabOpen(true)}
        onClose={() => setFabOpen(false)}
        catalog={catalog}
        enabledModelingDomains={project.enabledModelingDomains}
        onCreate={onCreateDiagram}
        onOpenDomains={() => setSettingsOpen(true)}
      />

      <ProjectSettings
        project={project}
        catalog={catalog}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={(domains) => {
          const p = getProject(projectId);
          p.enabledModelingDomains = domains;
          upsertProject(p);
          setProject({ ...p });
          const views = new Set();
          domains.forEach((id) => {
            (catalog?.domainIndex?.[id] || []).forEach((t) => views.add(t));
          });
          pushLog(
            `modeling domains → ${domains.length} enabled` +
              (views.size ? ` (views: ${[...views].sort().join(', ')})` : '')
          );
        }}
      />
    </div>
  );
}
