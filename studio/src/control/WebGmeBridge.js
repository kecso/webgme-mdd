/**
 * Bridge to WebGME client / REST — intentionally stubbed.
 *
 * In production (webgme-dss style):
 *   window.onGMEInit → new GME.classes.Client(gmeConfig) → connectToDatabase
 *   selectProject / closeProject / run plugins / REST DomainManager
 */

export const WebGmeBridge = {
  /** @returns {boolean} */
  isConnected() {
    return typeof window !== 'undefined' && !!window.gmeClient;
  },

  /**
   * TODO(webgme): wire DSS-style onGMEInit + /api/user.
   * @returns {Promise<{ connected: boolean, user: object|null }>}
   */
  async connect() {
    // Studio runs view-only against demo store until engine is attached.
    return { connected: false, user: { _id: 'local', displayName: 'Local demo' } };
  },

  /**
   * TODO(webgme): gmeClient.selectProject(projectId, branch, cb)
   */
  async openProject(_projectId) {
    return { ok: true, mode: 'demo' };
  },

  /**
   * TODO(webgme): invoke ExportMermaid / ExportEARS for active diagram node.
   */
  async exportDiagramSource(_projectId, _diagramNodePath) {
    return null;
  },

  /**
   * TODO(webgme): DomainManager REST createProject / updateProject.
   */
  async syncEnabledDomains(_projectId, _domainIds) {
    return { ok: false, reason: 'TODO: DomainManager REST not wired' };
  }
};
