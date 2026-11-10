/**
 * Local demo project store until WebGME gmeClient + DomainManager exist.
 * Persists in localStorage so refresh keeps domain picks / diagram sources.
 */

const STORAGE_KEY = 'webgme-mdd-studio-demo-v1';

const S1_DOMAINS = [
  'ears',
  'requirement',
  'usecase',
  'c4',
  'architecture',
  'class',
  'state',
  'sequence',
  'flowchart',
  'er'
];

function defaultState() {
  return {
    projects: [
      {
        id: 'demo+s1-aeb',
        owner: 'demo',
        name: 's1-aeb',
        title: 'S1 AEB / CACC (demo)',
        enabledDomains: [...S1_DOMAINS],
        // diagram instances in the project (id → { domainId, name, source })
        diagrams: {}
      }
    ]
  };
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return defaultState();
}

export function saveStore(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function listProjects() {
  return loadStore().projects;
}

export function getProject(projectId) {
  return loadStore().projects.find((p) => p.id === projectId) || null;
}

export function upsertProject(project) {
  const state = loadStore();
  const idx = state.projects.findIndex((p) => p.id === project.id);
  if (idx === -1) state.projects.push(project);
  else state.projects[idx] = project;
  saveStore(state);
  return project;
}

export function createProject({ name, owner = 'demo', enabledDomains }) {
  const id = `${owner}+${name}`;
  const project = {
    id,
    owner,
    name,
    title: name,
    enabledDomains: enabledDomains?.length ? enabledDomains : [...S1_DOMAINS],
    diagrams: {}
  };
  return upsertProject(project);
}

export function setEnabledDomains(projectId, enabledDomains) {
  const project = getProject(projectId);
  if (!project) return null;
  project.enabledDomains = enabledDomains;
  // TODO(webgme): DomainManager.updateProject — add/remove libraries + DomainSelector plugin
  return upsertProject(project);
}

export function setDiagramSource(projectId, diagramKey, patch) {
  const project = getProject(projectId);
  if (!project) return null;
  project.diagrams[diagramKey] = {
    ...(project.diagrams[diagramKey] || {}),
    ...patch
  };
  return upsertProject(project);
}

export { S1_DOMAINS };
