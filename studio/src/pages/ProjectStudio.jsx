import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import DiagramBrowser from '../components/DiagramBrowser.jsx';
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

export default function ProjectStudio() {
  const { owner, name } = useParams();
  const projectId = `${owner}+${name}`;

  const [project, setProject] = useState(() => getProject(projectId));
  const [catalog, setCatalog] = useState(null);
  const [activeKey, setActiveKey] = useState(null);
  const [viewSource, setViewSource] = useState('');
  const [draftSource, setDraftSource] = useState('');
  const [sourceOpen, setSourceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      .then(setCatalog)
      .catch((e) => pushLog(`catalog load failed: ${e.message}`));
  }, [pushLog]);

  useEffect(() => {
    setProject(getProject(projectId));
  }, [projectId]);

  const domains = useMemo(() => {
    if (!catalog) return [];
    return [...(catalog.diagrams || []), ...(catalog.companionLanguages || [])];
  }, [catalog]);

  const active = activeKey && project?.diagrams?.[activeKey];
  const domainId = active?.domainId || null;
  const dirty = draftSource !== viewSource;

  const ensureSample = useCallback(
    async (domainId, diagramKey, diagramName) => {
      let source = project?.diagrams?.[diagramKey]?.source;
      if (!source) {
        const res = await fetch(`/api/sample/${domainId}`);
        source = res.ok
          ? await res.text()
          : domainId === 'ears'
            ? 'REQ-001 [ubiquitous]\nThe system shall start.\n'
            : `flowchart TD\n  A[${diagramName}] --> B[Edit me]`;
        const next = setDiagramSource(projectId, diagramKey, {
          domainId,
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
      pushLog(`opened ${diagramKey}`);
    },
    [project, projectId, control, pushLog]
  );

  const onSelectDiagram = async (key) => {
    setActiveKey(key);
    const inst = project.diagrams[key];
    if (!inst) return;
    await ensureSample(inst.domainId, key, inst.name);
  };

  const onCreateDiagram = async (domainId) => {
    const count =
      Object.values(project.diagrams).filter((d) => d.domainId === domainId).length + 1;
    const diagramName = `${domainId}-${count}`;
    const key = `${domainId}:${diagramName}`;
    const next = setDiagramSource(projectId, key, {
      domainId,
      name: diagramName,
      source: ''
    });
    setProject({ ...next });
    setActiveKey(key);
    await ensureSample(domainId, key, diagramName);
    setSourceOpen(true);
  };

  const onApply = async () => {
    if (!activeKey || !domainId) return;
    setApplyBusy(true);
    try {
      const result = await control.applySource({
        diagramKey: activeKey,
        domainId,
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

  return (
    <div className="studio-shell">
      <Header
        project={project}
        sourceOpen={sourceOpen}
        onToggleSource={() => setSourceOpen((v) => !v)}
        onOpenSettings={() => setSettingsOpen(true)}
        userLabel={userLabel}
      />
      <div className={`studio-body${sourceOpen ? ' with-source' : ''}`}>
        <DiagramBrowser
          domains={domains}
          enabledDomains={project.enabledDomains}
          diagrams={project.diagrams}
          activeKey={activeKey}
          onSelect={onSelectDiagram}
          onCreate={onCreateDiagram}
        />
        <main className="studio-main">
          {activeKey && domainId ? (
            <DiagramCanvas
              domainId={domainId}
              source={viewSource}
              control={control}
              selectedId={selectedId}
              onSelectedId={setSelectedId}
            />
          ) : (
            <div className="empty-canvas">
              <h2>Select or create a diagram</h2>
              <p>Enabled domains come from project settings (S1 set by default).</p>
            </div>
          )}
        </main>
        <Inspector
          domainId={domainId}
          selectedId={selectedId}
          diagramKey={activeKey}
          log={log}
        />
        <SourceEditorPanel
          open={sourceOpen}
          onClose={() => setSourceOpen(false)}
          domainId={domainId || 'flowchart'}
          diagramKey={activeKey || '—'}
          draft={draftSource}
          onDraftChange={setDraftSource}
          onApply={onApply}
          applyBusy={applyBusy}
          statusMessage={applyMsg}
          dirty={dirty}
        />
      </div>
      <ProjectSettings
        project={project}
        catalog={catalog}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={(domains) => {
          const p = getProject(projectId);
          p.enabledDomains = domains;
          upsertProject(p);
          setProject({ ...p });
          pushLog(`domains → ${domains.length} enabled`);
        }}
      />
    </div>
  );
}
