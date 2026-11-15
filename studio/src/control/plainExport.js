/**
 * Project export for the running studio.
 *
 * studio:webgme downloads the storage package (.webgmex).
 * studio:demo downloads the local project document.
 */

import { WebGmeBridge } from './WebGmeBridge.js';
import { isDemoRuntime } from './runtime.js';

function triggerDownload(href, fileName) {
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadProjectDocument(project) {
  const fileName = `${project.name || 'project'}.json`;
  const blob = new Blob([`${JSON.stringify(project, null, 2)}\n`], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, fileName);
  // Revoking in the same turn cancels the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { kind: 'json', fileName };
}

/**
 * @param {object} project
 * @returns {Promise<{ kind: 'webgmex'|'json', fileName: string }>}
 */
export async function plainExportProject(project) {
  if (!project) throw new Error('No project to export');
  if (isDemoRuntime()) return downloadProjectDocument(project);
  const result = await WebGmeBridge.exportProjectFile(project.id, 'master');
  if (!result || !result.downloadUrl) {
    throw new Error('WebGME did not return a project package');
  }
  const prefix = window.gmeClient.mountedPath || '';
  const href = result.downloadUrl.startsWith('/')
    ? `${prefix}${result.downloadUrl}`
    : result.downloadUrl;
  const fileName = result.fileName || `${project.name}.webgmex`;
  triggerDownload(href, fileName);
  return { kind: 'webgmex', fileName };
}
