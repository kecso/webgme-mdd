'use strict';

/**
 * MDD project shell and language libraries.
 *
 * The shell (mdd/mdd.webgmex) defines one meta concept, Project, which can
 * contain any FCO. A Project node in the seed is the folder diagrams live in.
 * Each selected language is mounted as a WebGME library. The library name is
 * the diagram directory (ears, state, c4, …).
 *
 *   node scripts/mdd-project.js --write-seed
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const webgme = require('webgme');
const Q = require('q');
const AdmZip = require('adm-zip');

const gmeMemory = require('./generate-webgmex');
const { buildDocument, guidFor } = require('./language-document');

const REPO_ROOT = gmeMemory.REPO_ROOT;
const MDD_DIR = path.join(REPO_ROOT, 'mdd');
const BRANCH = gmeMemory.BRANCH;
const FOLDER_NAME = 'Project';

function domainMap() {
  return JSON.parse(fs.readFileSync(path.join(MDD_DIR, 'domains.json'), 'utf8'));
}

function librariesForDomains(domains) {
  const map = domainMap();
  const found = new Set();
  (domains || []).forEach((domain) => {
    if (!Object.prototype.hasOwnProperty.call(map, domain)) {
      throw new Error('Unknown modeling domain: ' + domain);
    }
    (map[domain] || []).forEach((id) => found.add(id));
  });
  return [...found].sort();
}

function languageWebgmex(libraryId) {
  return path.join(gmeMemory.DIAGRAMS_ROOT, libraryId, 'metamodel', libraryId + '.webgmex');
}

function buildShellDocument() {
  const doc = buildDocument('mdd', [{
    name: 'Project',
    attributes: { name: 'Project' },
    attributeMeta: { name: { type: 'string' } },
    position: { x: 220, y: 180 }
  }], 'Project', '');
  const fcoGuid = guidFor('mdd', 'FCO');
  const projectGuid = guidFor('mdd', 'Project');
  const folderGuid = guidFor('mdd', 'ProjectFolder');
  const project = (doc.children || []).find((child) => child.attributes && child.attributes.name === 'Project');
  if (!project) throw new Error('Shell document is missing the Project concept');
  project.children_meta = {
    [fcoGuid]: { min: -1, max: -1 }
  };
  doc.children.push({
    id: folderGuid,
    path: '/b',
    guid: folderGuid,
    attributes: { name: FOLDER_NAME },
    attribute_meta: {},
    pointers: { base: projectGuid },
    pointer_meta: {},
    mixins: [],
    registry: { position: { x: 480, y: 180 } },
    sets: {},
    member_registry: {},
    member_attributes: {},
    children: [],
    children_meta: null
  });
  return doc;
}

function readWebgmex(filePath) {
  const zip = new AdmZip(filePath);
  const entry = zip.getEntry('project.json');
  if (!entry) throw new Error(filePath + ' has no project.json');
  return JSON.parse(zip.readAsText(entry));
}

async function openEnvironment() {
  const blobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webgme-mdd-shell-'));
  const gmeConfig = gmeMemory.makeConfig(blobDir);
  gmeConfig.server.log.transports[0].options.level = 'error';
  const logger = webgme.Logger.create('gme:mdd:shell', gmeConfig.server.log);
  const BlobClient = require('webgme-engine/src/server/middleware/blob/BlobClientWithFSBackend');
  const { storage, gmeAuth } = await gmeMemory.openStorage(gmeConfig, logger);
  let seq = 0;
  return {
    gmeConfig,
    logger,
    storage,
    blobClient: new BlobClient(gmeConfig, logger.fork('blob')),
    storageUtils: webgme.requirejs('common/storage/util'),
    nextProjectName() {
      seq += 1;
      return 'mdd' + seq;
    },
    async close() {
      await storage.closeDatabase();
      if (typeof gmeAuth.unload === 'function') await gmeAuth.unload();
      fs.rmSync(blobDir, { recursive: true, force: true });
    }
  };
}

async function loadCommitRoot(project, core, commitHash) {
  const commitObject = await Q.ninvoke(project, 'loadObject', commitHash);
  return core.loadRoot(commitObject.root);
}

async function applyDocument(env, project, spec, parentHash, message) {
  const Core = webgme.requirejs('common/core/coreQ');
  const JSONImporter = webgme.requirejs('webgme-json-importer/JSONImporter');
  const core = new Core(project, { globConf: env.gmeConfig, logger: env.logger.fork('core') });
  const root = await loadCommitRoot(project, core, parentHash);
  const importer = new JSONImporter(core, root);
  await importer.apply(root, spec);
  const persisted = await core.persist(root);
  const commit = await project.makeCommit(
    BRANCH,
    [parentHash],
    persisted.rootHash,
    persisted.objects,
    message
  );
  return { core, root: await loadCommitRoot(project, core, commit.hash), commitHash: commit.hash };
}

/**
 * Open a project seeded from the MDD shell. Pass domains to mount every
 * language those domains use, or libraries to mount directory names directly.
 * @returns {Promise<object>} host with core, root, project, describe(), addLanguage(), close()
 */
async function createMddProject(options) {
  const opts = options || {};
  const libraries = unique([].concat(
    librariesForDomains(opts.domains || []),
    opts.libraries || []
  )).sort();
  const env = await openEnvironment();
  try {
    const guest = env.gmeConfig.authentication.guestAccount;
    const project = await env.storage.createProject({
      projectName: env.nextProjectName(),
      ownerId: guest,
      username: guest
    });
    const seeded = await env.storageUtils.insertProjectJson(project, gmeMemory.readSeedProject(), {
      branch: BRANCH,
      commitMessage: 'Seed empty project'
    });
    let host = await applyDocument(
      env,
      project,
      buildShellDocument(),
      seeded.hash,
      'Define Project shell'
    );
    host.project = project;
    host.env = env;
    host.addLanguage = (libraryId) => addLanguage(host, libraryId);
    host.describe = () => describeProject(host.core, host.root);
    host.close = () => env.close();
    for (let i = 0; i < libraries.length; i += 1) {
      host = await addLanguage(host, libraries[i]);
    }
    return host;
  } catch (err) {
    await env.close();
    throw err;
  }
}

async function addLanguage(host, libraryId) {
  const filePath = languageWebgmex(libraryId);
  if (!fs.existsSync(filePath)) {
    throw new Error('No webgmex for language "' + libraryId + '" at ' + filePath);
  }
  if (host.core.getLibraryNames(host.root).includes(libraryId)) {
    return host;
  }
  const projectJson = readWebgmex(filePath);
  await host.env.storageUtils.insertProjectJson(host.project, projectJson, {
    commitMessage: 'Objects for library ' + libraryId
  });
  await host.core.addLibrary(host.root, libraryId, projectJson.rootHash, {
    projectId: projectJson.projectId || libraryId,
    branchName: projectJson.branchName || BRANCH,
    commitHash: projectJson.commitHash
  });
  const persisted = await host.core.persist(host.root);
  const commit = await host.project.makeCommit(
    BRANCH,
    [host.commitHash],
    persisted.rootHash,
    persisted.objects,
    'Add library ' + libraryId
  );
  host.commitHash = commit.hash;
  host.root = await loadCommitRoot(host.project, host.core, commit.hash);
  return host;
}

async function describeProject(core, root) {
  const metaNodes = Object.values(core.getAllMetaNodes(root));
  const metaPaths = new Set(metaNodes.map((node) => core.getPath(node)));
  const children = await core.loadChildren(root);
  const folder = children.find((node) =>
    core.getAttribute(node, 'name') === FOLDER_NAME && !metaPaths.has(core.getPath(node))
  );
  let folderInfo = null;
  if (folder) {
    const base = core.getBase(folder);
    folderInfo = {
      name: core.getAttribute(folder, 'name'),
      path: core.getPath(folder),
      base: base ? core.getAttribute(base, 'name') : null
    };
  }
  const meta = metaNodes.map((node) => {
    const namespace = core.getNamespace(node) || '';
    return {
      name: core.getAttribute(node, 'name'),
      library: namespace
    };
  }).sort((a, b) => (a.library + a.name).localeCompare(b.library + b.name));
  return {
    libraries: core.getLibraryNames(root).slice().sort(),
    meta,
    folder: folderInfo
  };
}

function unique(items) {
  return [...new Set(items)];
}

async function writeSeed() {
  const docPath = path.join(MDD_DIR, 'Language.json');
  const outFile = path.join(MDD_DIR, 'mdd.webgmex');
  fs.mkdirSync(MDD_DIR, { recursive: true });
  fs.writeFileSync(docPath, JSON.stringify(buildShellDocument(), null, 2) + '\n');
  const host = await createMddProject();
  try {
    await gmeMemory.exportWebgmex(host.project, host.env.gmeConfig, host.env.logger, host.env.blobClient, outFile);
    const described = await host.describe();
    console.log('wrote ' + path.relative(REPO_ROOT, outFile));
    console.log(JSON.stringify(described, null, 2));
  } finally {
    await host.close();
  }
}

module.exports = {
  FOLDER_NAME,
  MDD_DIR,
  buildShellDocument,
  librariesForDomains,
  languageWebgmex,
  createMddProject,
  addLanguage,
  describeProject,
  writeSeed
};

if (require.main === module) {
  const write = process.argv.includes('--write-seed');
  if (!write) {
    console.error('Usage: node scripts/mdd-project.js --write-seed');
    process.exit(1);
  }
  writeSeed().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
}
