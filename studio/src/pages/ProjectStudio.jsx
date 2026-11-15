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
import { plainExportProject } from '../control/plainExport.js';
import {
  extendProjectLanguages,
  getProject,
  loadProject,
  setDiagramSource
} from '../data/projectDocument.js';
import { upsertProject } from '../data/demoStore.js';
import { isDemoRuntime } from '../control/runtime.js';
import { inferModelingDomain, diagramsForDomain } from '../data/modelingDomains.js';

export default function ProjectStudio() {
  const { owner, name } = useParams();
  const navigate = useNavigate();
  const projectId = `${owner}+${name}`;

  const [project, setProject] = useState(() => (isDemoRuntime() ? getProject(projectId) : null));
  const [projectReady, setProjectReady] = useState(isDemoRuntime());
  const [catalog, setCatalog] = useState(null);
  const [mode, setMode] = useState('overview'); // overview | canvas
  const [activeKey, setActiveKey] = useState(null);
  const [viewSource, setViewSource] = useState('');
  const [draftSource, setDraftSource] = useState('');
  const [sourceOpen, setSourceOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [log, setLog] = useState([]);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');
  const [userLabel, setUserLabel] = useState(isDemoRuntime() ? 'Local demo' : '');

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
    let cancelled = false;
    WebGmeBridge.connect().then((r) => {
      if (cancelled) return;
      if (r.user?.displayName) setUserLabel(r.user.displayName);
      pushLog(r.connected ? `WebGME runtime (${r.user._id})` : 'Demo runtime');
    });
    WebGmeBridge.openProject(projectId).catch((err) => {
      if (!cancelled) pushLog(`open project failed: ${err && err.message ? err.message : err}`);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, pushLog]);

  useEffect(() => {
    let cancelled = false;
    if (isDemoRuntime()) {
      setProject(getProject(projectId));
      setProjectReady(true);
      setMode('overview');
      setActiveKey(null);
      return undefined;
    }
    setProjectReady(false);
    loadProject(projectId).then((loaded) => {
      if (cancelled) return;
      setProject(loaded);
      setProjectReady(true);
      setMode('overview');
      setActiveKey(null);
    }).catch(() => {
      if (cancelled) return;
      setProject(null);
      setProjectReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((cat) => {
        setCatalog(cat);
        if (!isDemoRuntime()) return;
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

  const active = activeKey && project?.diagrams?.[activeKey];
  const diagramType = active?.diagramType || null;
  const dirty = draftSource !== viewSource;

  const ensureSample = useCallback(
    async (diagramTypeId, diagramKey, diagramName, modelingDomainId, providedSource) => {
      let source = providedSource;
      if (!source) source = project?.diagrams?.[diagramKey]?.source;
      if (!source) {
        const res = await fetch(`/api/sample/${diagramTypeId}`);
        source = res.ok
          ? await res.text()
          : diagramTypeId === 'ears'
            ? 'REQ-001 [ubiquitous]\nThe system shall start.\n'
            : `flowchart TD\n  A[${diagramName}] --> B[Edit me]`;
        const next = await setDiagramSource(projectId, diagramKey, {
          diagramType: diagramTypeId,
          modelingDomainId,
          name: diagramName,
          source
        });
        if (next) setProject({ ...next });
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

  const revealDiagram = () => {
    if (mode !== 'canvas' && activeKey) setMode('canvas');
  };

  const onCreateDiagram = async ({ diagramType: typeId, name: diagramName, source: importedSource }) => {
    const allowed = project.allowedDiagramTypes || [];
    if (!allowed.includes(typeId)) {
      pushLog(`create blocked: ${typeId} is not an allowed diagram on this project`);
      return;
    }

    const enabled = project.enabledModelingDomains || [];
    let modelingDomainId = enabled.find((id) => diagramsForDomain(id).includes(typeId)) || null;
    if (!modelingDomainId && project.profile === 'domain') {
      modelingDomainId = project.profileDomain;
    } else if (!modelingDomainId && project.profile === 'story') {
      modelingDomainId = inferModelingDomain(catalog, typeId, enabled);
    }

    const count =
      Object.values(project.diagrams).filter((d) => d.diagramType === typeId).length + 1;
    const finalName = diagramName || `${typeId}-${count}`;
    const key = `${modelingDomainId || 'project'}:${typeId}:${finalName}`;
    const initial = typeof importedSource === 'string' ? importedSource : '';
    const next = await setDiagramSource(projectId, key, {
      modelingDomainId,
      diagramType: typeId,
      name: finalName,
      source: initial
    });
    if (next) setProject({ ...next });
    setActiveKey(key);
    setMode('canvas');
    await ensureSample(typeId, key, finalName, modelingDomainId, initial || undefined);
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
      setProject(getProject(projectId) || project);
      setApplyMsg(result.message || result.status);
    } catch (e) {
      setApplyMsg(e.message || String(e));
    } finally {
      setApplyBusy(false);
    }
  };

  if (!projectReady) {
    return (
      <div className="page">
        <p>Opening project…</p>
      </div>
    );
  }

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
    sourceOpen && mode === 'canvas' ? 'with-source' : '',
    mode === 'canvas' && !inspectorOpen ? 'inspector-hidden' : ''
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
        onToggleSource={() => {
          revealDiagram();
          setSourceOpen((v) => !v);
        }}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => {
          revealDiagram();
          setInspectorOpen((v) => !v);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onExportBook={() => {
          pushLog('opening Markdown book preview');
          navigate(`/p/${owner}/${name}/book`);
        }}
        onPlainExport={() => {
          plainExportProject(project)
            .then((result) => pushLog(`export project ${result.fileName}`))
            .catch((err) => pushLog(`export project failed: ${err && err.message ? err.message : err}`));
        }}
        onCloseDiagram={() => {
          setActiveKey(null);
          setSelectedId(null);
          setMode('overview');
        }}
        onCloseProject={() => navigate('/projects')}
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
              diagramKey={activeKey}
              domainId={diagramType}
              source={viewSource}
              control={control}
              selectedId={selectedId}
              onSelectedId={setSelectedId}
            />
          ) : (
            <div className="empty-canvas">
              <h2>No diagram open</h2>
              <p>Return to overview, or use + to create an allowed diagram.</p>
            </div>
          )}
        </main>
        {mode === 'canvas' && inspectorOpen ? (
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
        allowedDiagramTypes={project.allowedDiagramTypes}
        onCreate={onCreateDiagram}
        onOpenDiagrams={() => setSettingsOpen(true)}
      />

      <ProjectSettings
        project={project}
        open={settingsOpen}
        libraryHost={!isDemoRuntime()}
        onClose={() => setSettingsOpen(false)}
        onSaved={async ({ diagramTypes, domains }) => {
          const saved = await extendProjectLanguages(projectId, { diagramTypes, domains });
          if (saved) setProject({ ...saved });
          const added = (diagramTypes || []).filter(
            (id) => !(project.allowedDiagramTypes || []).includes(id)
          );
          pushLog(
            added.length
              ? `added libraries ${added.join(', ')}`
              : 'domains unchanged'
          );
        }}
      />
    </div>
  );
}
