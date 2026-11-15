/**
 * Project catalog for the running studio.
 *
 * The demo runtime keeps projects in localStorage. The WebGME runtime uses
 * storage: DomainManager seeds the project, and the studio document (diagram
 * text, allowed types) is saved on the project description until that text
 * is applied into the model.
 */

import { WebGmeBridge } from '../control/WebGmeBridge.js';
import { isDemoRuntime } from '../control/runtime.js';
import { diagramsForDomain } from './modelingDomains.js';
import {
  createProject as createDemoProject,
  dropProject as dropDemoProject,
  getProject as getDemoProject,
  listProjects as listDemoProjects,
  resetS1DemoProject,
  setAllowedDiagramTypes as setDemoAllowedDiagramTypes,
  setDiagramSource as setDemoDiagramSource,
  setProjectLanguages as setDemoProjectLanguages
} from './demoStore.js';

const DOC_PREFIX = 'mdss:';
const PROJECT_NAME = /^[0-9A-Za-z_]+$/;

const cache = new Map();

export { resetS1DemoProject };

export function assertStorageName(raw) {
  const name = String(raw || '').trim();
  if (!PROJECT_NAME.test(name)) {
    throw new Error('Use letters, digits, and underscores for the project name.');
  }
  return name;
}

function parseDomains(kind) {
  const raw = String(kind || '');
  if (!raw.startsWith('MDSS:')) return [];
  return raw.slice('MDSS:'.length).split(':').filter(Boolean);
}

function blankDocument(name, domains) {
  const profileDomain = domains.length === 1 ? domains[0] : null;
  return {
    title: name,
    storyId: 'S1',
    profile: profileDomain ? 'domain' : 'empty',
    profileDomain,
    allowedDiagramTypes: profileDomain ? diagramsForDomain(profileDomain) : [],
    enabledModelingDomains: domains,
    diagrams: {},
    correspondences: [],
    integrating: null
  };
}

function readDocument(description, name, kind) {
  if (typeof description === 'string' && description.startsWith(DOC_PREFIX)) {
    try {
      const parsed = JSON.parse(description.slice(DOC_PREFIX.length));
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* fall through to the kind stamp */
    }
  }
  return blankDocument(name, parseDomains(kind));
}

function projectFromRecord(record) {
  const id = record._id || `${record.owner}+${record.name}`;
  const plus = id.indexOf('+');
  const owner = record.owner || id.slice(0, plus);
  const name = record.name || id.slice(plus + 1);
  const info = record.info || {};
  const doc = readDocument(info.description, name, info.kind);
  return {
    id,
    owner,
    name,
    ...doc,
    title: doc.title || name
  };
}

function documentPayload(project) {
  return {
    title: project.title,
    storyId: project.storyId,
    profile: project.profile,
    profileDomain: project.profileDomain,
    allowedDiagramTypes: project.allowedDiagramTypes,
    enabledModelingDomains: project.enabledModelingDomains,
    diagrams: project.diagrams,
    correspondences: project.correspondences,
    integrating: project.integrating
  };
}

async function readJson(res) {
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed (${res.status})`);
  return text ? JSON.parse(text) : null;
}

async function persist(project) {
  cache.set(project.id, project);
  const res = await fetch(
    `/api/projects/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.name)}`,
    {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: DOC_PREFIX + JSON.stringify(documentPayload(project)) })
    }
  );
  await readJson(res);
  return project;
}

export function listProjects() {
  if (isDemoRuntime()) return Promise.resolve(listDemoProjects());
  return fetch('/api/projects', { credentials: 'same-origin' })
    .then(readJson)
    .then((rows) => {
      const projects = (rows || []).map(projectFromRecord);
      cache.clear();
      projects.forEach((project) => cache.set(project.id, project));
      return projects;
    });
}

export function getProject(projectId) {
  if (isDemoRuntime()) return getDemoProject(projectId);
  return cache.get(projectId) || null;
}

export async function loadProject(projectId) {
  if (isDemoRuntime()) return getDemoProject(projectId);
  const cached = cache.get(projectId);
  if (cached) return cached;
  const plus = projectId.indexOf('+');
  const owner = projectId.slice(0, plus);
  const name = projectId.slice(plus + 1);
  const res = await fetch(
    `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    { credentials: 'same-origin' }
  );
  if (!res.ok) return null;
  const record = await readJson(res);
  if (!record) return null;
  const project = projectFromRecord(record);
  cache.set(project.id, project);
  return project;
}

export async function createProject(spec) {
  if (isDemoRuntime()) return createDemoProject(spec);
  const projectName = assertStorageName(spec.name);
  const domains = spec.profile === 'domain' && spec.profileDomain ? [spec.profileDomain] : [];
  const created = await WebGmeBridge.createProject({
    projectName,
    domains
  });
  const projectId = created.projectId;
  const plus = projectId.indexOf('+');
  const project = {
    id: projectId,
    owner: projectId.slice(0, plus),
    name: projectId.slice(plus + 1),
    ...blankDocument(projectName, domains)
  };
  if (Array.isArray(spec.allowedDiagramTypes)) {
    project.allowedDiagramTypes = [...spec.allowedDiagramTypes];
  }
  return persist(project);
}

export async function dropProject(projectId) {
  if (isDemoRuntime()) return dropDemoProject(projectId);
  await WebGmeBridge.deleteProject(projectId);
  cache.delete(projectId);
  return null;
}

function unionIds(current, extra) {
  return [...new Set([...(current || []), ...(extra || [])])];
}

/**
 * Add domains and diagram languages. Already present ones stay.
 * On the WebGME host, each new diagram id is mounted from its seed.
 */
export async function extendProjectLanguages(projectId, { diagramTypes = [], domains = [] } = {}) {
  const current = isDemoRuntime() ? getDemoProject(projectId) : cache.get(projectId);
  if (!current) return null;
  const allowedDiagramTypes = unionIds(current.allowedDiagramTypes, diagramTypes);
  const enabledModelingDomains = unionIds(current.enabledModelingDomains, domains);
  const addedLibraries = allowedDiagramTypes.filter(
    (id) => !(current.allowedDiagramTypes || []).includes(id)
  );
  const addedDomains = enabledModelingDomains.filter(
    (id) => !(current.enabledModelingDomains || []).includes(id)
  );
  if (!isDemoRuntime() && (addedLibraries.length || addedDomains.length)) {
    await WebGmeBridge.addLibraries(projectId, addedLibraries, addedDomains);
  }
  if (isDemoRuntime()) {
    return setDemoProjectLanguages(projectId, { allowedDiagramTypes, enabledModelingDomains });
  }
  return persist({
    ...current,
    allowedDiagramTypes,
    enabledModelingDomains
  });
}

export async function setAllowedDiagramTypes(projectId, allowedDiagramTypes) {
  if (isDemoRuntime()) return setDemoAllowedDiagramTypes(projectId, allowedDiagramTypes);
  const project = cache.get(projectId);
  if (!project) return null;
  return persist({
    ...project,
    allowedDiagramTypes: [...allowedDiagramTypes]
  });
}

export async function setDiagramSource(projectId, diagramKey, patch) {
  if (isDemoRuntime()) return setDemoDiagramSource(projectId, diagramKey, patch);
  const project = cache.get(projectId);
  if (!project) return null;
  const prev = project.diagrams[diagramKey] || {};
  const diagrams = {
    ...project.diagrams,
    [diagramKey]: {
      ...prev,
      ...patch,
      diagramType: patch.diagramType || prev.diagramType,
      modelingDomainId: patch.modelingDomainId || prev.modelingDomainId
    }
  };
  return persist({ ...project, diagrams });
}
