/**
 * Bridge to WebGME client / REST.
 *
 * Production (webgme-dss style):
 *   window.onGMEInit → new GME.classes.Client(gmeConfig) → connectToDatabase
 *   selectProject / closeProject / run plugins / REST DomainManager
 *
 * Vite demo mode: no window.GME — local demo store remains source of truth.
 */

function mountedApi(path) {
  const prefix =
    (typeof window !== 'undefined' && window.gmeClient && window.gmeClient.mountedPath) ||
    '';
  return `${prefix}${path}`;
}

export const WebGmeBridge = {
  /** @returns {boolean} */
  isConnected() {
    return typeof window !== 'undefined' && !!window.gmeClient;
  },

  /**
   * Called from main.jsx when webgme.classes invokes onGMEInit.
   * @param {string} mountedPath
   */
  async bootstrapFromGmeInit(mountedPath = '') {
    if (typeof window === 'undefined' || typeof window.GME === 'undefined') {
      throw new Error('window.GME is not available');
    }

    window.gmeClient = new window.GME.classes.Client(window.GME.gmeConfig);
    window.gmeClient.mountedPath = mountedPath || '';

    const userRes = await fetch(`${mountedPath}/api/user`, {
      credentials: 'same-origin'
    });
    if (!userRes.ok) {
      throw new Error(`Failed to load /api/user (${userRes.status})`);
    }
    const user = await userRes.json();

    await new Promise((resolve, reject) => {
      window.gmeClient.connectToDatabase((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return { connected: true, user };
  },

  /**
   * Demo / Vite path when engine client is absent.
   * @returns {Promise<{ connected: boolean, user: object|null }>}
   */
  async connect() {
    if (this.isConnected()) {
      return { connected: true, user: { _id: 'gme', displayName: 'WebGME user' } };
    }
    return { connected: false, user: { _id: 'local', displayName: 'Local demo' } };
  },

  /**
   * @param {string} projectId owner+name
   * @param {string} [branchName]
   */
  async openProject(projectId, branchName = 'master') {
    if (!this.isConnected()) {
      return { ok: true, mode: 'demo' };
    }

    return new Promise((resolve, reject) => {
      window.gmeClient.selectProject(projectId, branchName, (err) => {
        if (err) reject(err);
        else resolve({ ok: true, mode: 'webgme', projectId });
      });
    });
  },

  /**
   * TODO(webgme): invoke ExportMermaid / ExportEARS for active diagram node.
   */
  async exportDiagramSource(_projectId, _diagramNodePath) {
    return null;
  },

  /**
   * DomainManager REST — create project with enabled domains.
   * @param {{ projectName: string, domains: string[] }} body
   */
  async createProject(body) {
    if (!this.isConnected()) {
      return { ok: false, reason: 'WebGME client not connected' };
    }
    const res = await fetch(mountedApi('/DomainManager/createProject'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `createProject failed (${res.status})`);
    }
    return res.json();
  },

  /**
   * DomainManager REST — stamp enabled domains on project kind.
   */
  async syncEnabledDomains(projectId, domainIds) {
    if (!this.isConnected()) {
      return { ok: false, reason: 'TODO: DomainManager REST not wired (demo mode)' };
    }
    const res = await fetch(mountedApi('/DomainManager/updateProject'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, domains: domainIds })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `updateProject failed (${res.status})`);
    }
    return res.json();
  },

  async getSeedInfo() {
    if (!this.isConnected()) {
      return null;
    }
    const res = await fetch(mountedApi('/DomainManager/seedInfo'), {
      credentials: 'same-origin'
    });
    if (!res.ok) return null;
    return res.json();
  }
};
