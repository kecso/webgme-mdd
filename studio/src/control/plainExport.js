/**
 * Plain project export.
 *
 * A connected WebGME client downloads the regular .webgmex package.
 * The local demo has no storage project, so it downloads the project document.
 */

import { WebGmeBridge } from './WebGmeBridge.js';

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
  URL.revokeObjectURL(url);
  return { kind: 'json', fileName };
}

function missingInStorage(err) {
  const message = String(err && err.message ? err.message : err).toLowerCase();
  return message.includes('does not exist') || message.includes('not found') || message.includes('no such');
}

/**
 * @param {object} project demoStore project
 * @returns {Promise<{ kind: 'webgmex'|'json', fileName: string }>}
 */
export async function plainExportProject(project) {
  if (!project) throw new Error('No project to export');
  if (!WebGmeBridge.isConnected()) {
    return downloadProjectDocument(project);
  }
  try {
    const result = await WebGmeBridge.exportProjectFile(project.id, 'master');
    if (!result) return downloadProjectDocument(project);
    const prefix = window.gmeClient.mountedPath || '';
    const href = result.downloadUrl.startsWith('/')
      ? `${prefix}${result.downloadUrl}`
      : result.downloadUrl;
    const fileName = result.fileName || `${project.name}.webgmex`;
    triggerDownload(href, fileName);
    return { kind: 'webgmex', fileName };
  } catch (err) {
    if (missingInStorage(err)) return downloadProjectDocument(project);
    throw err;
  }
}
