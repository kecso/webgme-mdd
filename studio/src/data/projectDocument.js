/**
 * Project catalog for the running studio.
 *
 * studio:demo keeps a browser store because that process has no WebGME project.
 * studio:webgme reads the project: libraries, kind, and the diagram nodes under
 * the Project concept. Diagram text is the source attribute on those nodes.
 */

import { WebGmeBridge } from '../control/WebGmeBridge.js';
import { isDemoRuntime } from '../control/runtime.js';
import { legacyDiagrams } from '../control/projectModel.cjs';
import { placeDiagramOnClient, writeDiagramSource } from '../control/diagramNode.cjs';
import { commitDiagramUpdate } from '../control/applyModel.cjs';
import {
  createProject as createDemoProject,
  dropProject as dropDemoProject,
  getProject as getDemoProject,
  listProjects as listDemoProjects,
  resetS1DemoProject,
  setAllowedDiagramTypes as setDemoAllowedDiagramTypes,
  setDiagramSource as setDemoDiagramSource,
  setDiagramOptions as setDemoDiagramOptions,
  setProjectLanguages as setDemoProjectLanguages
} from './demoStore.js';

const PROJECT_NAME = /^[0-9A-Za-z_]+$/;

const cache = new Map();
const OPTION_KEY = 'mdss-diagram-options';

function readOptionBag() {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(OPTION_KEY) || '{}') || {};
  } catch (err) {
    return {};
  }
}

function writeOptionBag(bag) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(OPTION_KEY, JSON.stringify(bag));
}

function rememberOptions(projectId, diagramKey, options) {
  const bag = readOptionBag();
  if (!bag[projectId]) bag[projectId] = {};
  bag[projectId][diagramKey] = options;
  writeOptionBag(bag);
}

function attachOptions(project) {
  if (!project || !project.diagrams) return project;
  const saved = readOptionBag()[project.id] || {};
  const diagrams = { ...project.diagrams };
  Object.keys(saved).forEach((key) => {
    if (!diagrams[key]) return;
    diagrams[key] = { ...diagrams[key], options: saved[key] };
  });
  return { ...project, diagrams };
}

export { resetS1DemoProject };

export function assertStorageName(raw) {
  const name = String(raw || '').trim();
  if (!PROJECT_NAME.test(name)) {
    throw new Error('Use letters, digits, and underscores for the project name.');
  }
  return name;
}

function projectIdParts(projectId) {
  const plus = projectId.indexOf('+');
  return {
    owner: projectId.slice(0, plus),
    name: projectId.slice(plus + 1)
  };
}

async function remember(project) {
  cache.set(project.id, project);
  return project;
}

async function waitForLibraries(libraryIds) {
  const client = typeof window !== 'undefined' ? window.gmeClient : null;
  if (!client || typeof client.getLibraryNames !== 'function' || !libraryIds.length) return;
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const names = client.getLibraryNames() || [];
    if (libraryIds.every((id) => names.includes(id))) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function readJson(res) {
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed (${res.status})`);
  return text ? JSON.parse(text) : null;
}

async function fetchModel(owner, name) {
  const res = await fetch(`/DomainManager/project/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, {
    credentials: 'same-origin'
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Could not read project (${res.status})`);
  }
  return readJson(res);
}

async function adoptLegacyText(project) {
  const { owner, name } = projectIdParts(project.id);
  const res = await fetch(`/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, {
    credentials: 'same-origin'
  });
  if (!res.ok) return project;
  const record = await readJson(res);
  const legacy = legacyDiagrams(record && record.info && record.info.description);
  if (!legacy.length) return project;
  let changed = false;
  for (const inst of legacy) {
    const existing = Object.values(project.diagrams).find(
      (diagram) => diagram.name === inst.name && diagram.diagramType === inst.diagramType
    );
    if (existing) {
      if (!existing.source && inst.source) {
        await writeDiagramSource(existing.nodePath, inst.source);
        changed = true;
      }
      continue;
    }
    await placeDiagramOnClient({
      diagramType: inst.diagramType,
      name: inst.name,
      source: inst.source || ''
    });
    changed = true;
  }
  if (!changed) return project;
  return fetchModel(owner, name);
}

export function listProjects() {
  if (isDemoRuntime()) return Promise.resolve(listDemoProjects());
  return fetch('/DomainManager/projects', { credentials: 'same-origin' })
    .then(readJson)
    .then((rows) => {
      const projects = rows || [];
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
  const { owner, name } = projectIdParts(projectId);
  await WebGmeBridge.openProject(projectId);
  let project = await fetchModel(owner, name);
  project = await adoptLegacyText(project);
  return remember(attachOptions(project));
}

export async function createProject(spec) {
  if (isDemoRuntime()) return createDemoProject(spec);
  const projectName = assertStorageName(spec.name);
  const domains = spec.profile === 'domain' && spec.profileDomain ? [spec.profileDomain] : [];
  const created = await WebGmeBridge.createProject({
    projectName,
    domains
  });
  const { owner, name } = projectIdParts(created.projectId);
  return remember(await fetchModel(owner, name));
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
    await waitForLibraries(addedLibraries);
  }
  if (isDemoRuntime()) {
    return setDemoProjectLanguages(projectId, { allowedDiagramTypes, enabledModelingDomains });
  }
  const { owner, name } = projectIdParts(projectId);
  return remember(await fetchModel(owner, name));
}

export async function setAllowedDiagramTypes(projectId, allowedDiagramTypes) {
  if (isDemoRuntime()) return setDemoAllowedDiagramTypes(projectId, allowedDiagramTypes);
  return cache.get(projectId) || null;
}

export async function applyDiagramModel(projectId, diagramKey, spec) {
  if (isDemoRuntime()) throw new Error('The demo copy does not write diagram elements.');
  await WebGmeBridge.openProject(projectId);
  const client = typeof window !== 'undefined' ? window.gmeClient : null;
  const outcome = await commitDiagramUpdate(client, spec);
  const project = cache.get(projectId);
  const prev = project && project.diagrams[diagramKey];
  if (!prev) return { project, outcome };
  const diagrams = {
    ...project.diagrams,
    [diagramKey]: {
      ...prev,
      source: spec.source,
      lineNodes: outcome.status === 'applied' ? outcome.lineNodes : prev.lineNodes,
      lineNames: outcome.status === 'applied' ? outcome.names : prev.lineNames
    }
  };
  return { project: await remember({ ...project, diagrams }), outcome };
}

export function setDiagramOptions(projectId, diagramKey, options) {
  const next = { ...(options || {}) };
  rememberOptions(projectId, diagramKey, next);
  if (isDemoRuntime()) return setDemoDiagramOptions(projectId, diagramKey, next);
  const project = cache.get(projectId);
  if (!project || !project.diagrams || !project.diagrams[diagramKey]) return null;
  const diagrams = {
    ...project.diagrams,
    [diagramKey]: { ...project.diagrams[diagramKey], options: next }
  };
  return remember({ ...project, diagrams });
}

export async function setDiagramSource(projectId, diagramKey, patch) {
  if (isDemoRuntime()) return setDemoDiagramSource(projectId, diagramKey, patch);
  const project = cache.get(projectId);
  if (!project) return null;
  const prev = project.diagrams[diagramKey];
  if (!prev) return project;
  if (typeof patch.source === 'string' && patch.source !== prev.source) {
    await WebGmeBridge.openProject(projectId);
    await writeDiagramSource(diagramKey, patch.source);
  }
  const diagrams = {
    ...project.diagrams,
    [diagramKey]: {
      ...prev,
      source: typeof patch.source === 'string' ? patch.source : prev.source,
      name: patch.name || prev.name
    }
  };
  return remember({ ...project, diagrams });
}

export async function createDiagramNode(projectId, { diagramType, name, source }) {
  await WebGmeBridge.openProject(projectId);
  await placeDiagramOnClient({ diagramType, name, source: source || '' });
  const { owner, name: projectName } = projectIdParts(projectId);
  return remember(await fetchModel(owner, projectName));
}
