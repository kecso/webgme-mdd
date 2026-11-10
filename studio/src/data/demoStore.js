/**
 * Local demo project store until WebGME gmeClient + DomainManager exist.
 * Persists in localStorage.
 *
 * Project fields:
 *   enabledModelingDomains — modeling domain ids (ci-cd, uml, …), NOT diagram types
 *   diagrams[key] — { modelingDomainId, diagramType, name, source }
 *   correspondences[] — soft Integrating links for S1 demo feedback
 */

import { S1_MODELING_DOMAINS } from './modelingDomains.js';
import { S1_SEED_VERSION, buildS1DemoProject } from './s1DemoSeed.js';

const STORAGE_KEY = 'webgme-mdd-studio-demo-v2';

function defaultState() {
  return {
    projects: [buildS1DemoProject()]
  };
}

function ensureS1Seed(p) {
  if (p.id !== 'demo+s1-aeb' && !(p.owner === 'demo' && p.name === 's1-aeb')) {
    return p;
  }
  const diagramCount = Object.keys(p.diagrams || {}).length;
  const needsSeed =
    p.seedVersion !== S1_SEED_VERSION ||
    diagramCount === 0 ||
    // Older empty demo: only unseeded placeholders
    (diagramCount > 0 &&
      Object.values(p.diagrams).every((d) => !d.source || !String(d.source).trim()));

  if (!needsSeed) return p;

  const seeded = buildS1DemoProject();
  // Preserve user title tweaks; replace content with story seed.
  return {
    ...seeded,
    title: p.title || seeded.title,
    id: p.id || seeded.id,
    owner: p.owner || seeded.owner,
    name: p.name || seeded.name
  };
}

function migrateProject(p) {
  if (!p.enabledModelingDomains) {
    p.enabledModelingDomains = [...S1_MODELING_DOMAINS];
  }
  delete p.enabledDomains;

  Object.values(p.diagrams || {}).forEach((inst) => {
    if (!inst.diagramType && inst.domainId) {
      inst.diagramType = inst.domainId;
    }
    if (!inst.modelingDomainId) {
      inst.modelingDomainId = inst.modelingDomainId || null;
    }
    delete inst.domainId;
  });

  return ensureS1Seed(p);
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      let dirty = false;
      state.projects = (state.projects || []).map((p) => {
        const before = JSON.stringify(p.seedVersion) + Object.keys(p.diagrams || {}).length;
        const next = migrateProject(p);
        const after = JSON.stringify(next.seedVersion) + Object.keys(next.diagrams || {}).length;
        if (before !== after) dirty = true;
        return next;
      });
      if (dirty) saveStore(state);
      return state;
    }
    const legacy = localStorage.getItem('webgme-mdd-studio-demo-v1');
    if (legacy) {
      const state = JSON.parse(legacy);
      state.projects = (state.projects || []).map(migrateProject);
      saveStore(state);
      return state;
    }
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

export function createProject({
  name,
  owner = 'demo',
  enabledModelingDomains,
  storyId = 'S1'
}) {
  const id = `${owner}+${name}`;
  const project = {
    id,
    owner,
    name,
    title: name,
    storyId,
    enabledModelingDomains: enabledModelingDomains?.length
      ? enabledModelingDomains
      : [...S1_MODELING_DOMAINS],
    diagrams: {},
    correspondences: []
  };
  return upsertProject(project);
}

/**
 * Reset demo+s1-aeb back to story fixtures (for feedback loops).
 */
export function resetS1DemoProject() {
  return upsertProject(buildS1DemoProject());
}

export function setEnabledModelingDomains(projectId, enabledModelingDomains) {
  const project = getProject(projectId);
  if (!project) return null;
  project.enabledModelingDomains = enabledModelingDomains;
  return upsertProject(project);
}

export function setDiagramSource(projectId, diagramKey, patch) {
  const project = getProject(projectId);
  if (!project) return null;
  const prev = project.diagrams[diagramKey] || {};
  project.diagrams[diagramKey] = {
    ...prev,
    ...patch,
    diagramType: patch.diagramType || prev.diagramType,
    modelingDomainId: patch.modelingDomainId || prev.modelingDomainId
  };
  return upsertProject(project);
}

export { S1_MODELING_DOMAINS, S1_SEED_VERSION };
