'use strict';

/**
 * Apply a Language.json document onto an empty WebGME project and write the
 * result beside the language descriptor.
 *
 *   npm run generate:webgmex
 *   npm run generate:webgmex -- state ears
 *
 * Uses the kecso/webgme-json-importer fork (devDependency) and keeps the
 * project in memory, so MongoDB is not required.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const webgme = require('webgme');
const Q = require('q');
const AdmZip = require('adm-zip');
const MemoryGMEAuth = require('./gme-memory-auth/memorygmeauth');

const REPO_ROOT = path.join(__dirname, '..');
const DIAGRAMS_ROOT = path.join(REPO_ROOT, 'diagrams');
const BRANCH = 'master';

function importerPackageRoot() {
  return path.dirname(require.resolve('webgme-json-importer/package.json'));
}

function enginePackageRoot() {
  return path.dirname(require.resolve('webgme-engine/package.json'));
}

function languageIds(requested) {
  const available = fs.readdirSync(DIAGRAMS_ROOT).filter((id) =>
    fs.existsSync(path.join(DIAGRAMS_ROOT, id, 'metamodel', 'Language.json'))
  ).sort();
  if (!requested.length) return available;
  const unknown = requested.filter((id) => !available.includes(id));
  if (unknown.length) {
    throw new Error('Unknown language id: ' + unknown.join(', '));
  }
  return requested;
}

function readSeedProject() {
  const seedPath = path.join(enginePackageRoot(), 'seeds', 'EmptyProject.webgmex');
  const zip = new AdmZip(seedPath);
  const entry = zip.getEntry('project.json');
  if (!entry) throw new Error('EmptyProject.webgmex has no project.json');
  return JSON.parse(zip.readAsText(entry));
}

function makeConfig(blobDir) {
  const gmeConfig = require('webgme/config/config.default');
  const importerCommon = path.join(importerPackageRoot(), 'src', 'common');
  const umd = path.join(importerCommon, 'build', 'JSONImporter.umd.js');
  if (!fs.existsSync(umd)) {
    throw new Error(
      'webgme-json-importer has no built library at ' + umd +
      '. Reinstall github:kecso/webgme-json-importer so its prepare script can build it.'
    );
  }
  gmeConfig.storage.database.type = 'memory';
  gmeConfig.authentication.enable = false;
  gmeConfig.authentication.allowGuests = true;
  gmeConfig.authentication.guestCanCreate = true;
  gmeConfig.blob.fsDir = blobDir;
  gmeConfig.requirejsPaths = Object.assign({}, gmeConfig.requirejsPaths, {
    'webgme-json-importer': importerCommon
  });
  webgme.addToRequireJsPaths(gmeConfig);
  return gmeConfig;
}

async function openStorage(gmeConfig, logger) {
  const SafeStorage = require('webgme-engine/src/server/storage/safestorage');
  const Memory = require('webgme-engine/src/server/storage/memory');
  const gmeAuth = new MemoryGMEAuth(null, gmeConfig);
  await gmeAuth.connect();
  const storage = new SafeStorage(new Memory(logger, gmeConfig), logger, gmeConfig, gmeAuth);
  await storage.openDatabase();
  return { storage, gmeAuth };
}

async function applyLanguage(project, gmeConfig, logger, spec, seedCommit) {
  const Core = webgme.requirejs('common/core/coreQ');
  const JSONImporter = webgme.requirejs('webgme-json-importer/JSONImporter');
  const core = new Core(project, { globConf: gmeConfig, logger: logger.fork('core') });
  const commitObject = await Q.ninvoke(project, 'loadObject', seedCommit);
  const root = await core.loadRoot(commitObject.root);
  const importer = new JSONImporter(core, root);
  await importer.apply(root, spec);

  const expected = (spec.children || [])
    .map((child) => child.attributes && child.attributes.name)
    .filter((name) => name && name !== 'ROOT');
  const present = Object.values(core.getAllMetaNodes(root))
    .map((node) => core.getAttribute(node, 'name'))
    .filter(Boolean)
    .sort();
  const missing = expected.filter((name) => !present.includes(name));
  if (missing.length) {
    throw new Error('meta nodes missing after apply: ' + missing.join(', '));
  }

  const persisted = await core.persist(root);
  const commit = await project.makeCommit(
    BRANCH,
    [seedCommit],
    persisted.rootHash,
    persisted.objects,
    'Apply language ' + (spec.attributes && spec.attributes.name || '')
  );
  if (!commit || !commit.hash) {
    throw new Error('makeCommit did not return a hash');
  }
  return { concepts: present.length, commitHash: commit.hash, expected };
}

async function verifyWritten(env, id, outFile, expectedNames) {
  const zip = new AdmZip(outFile);
  const entry = zip.getEntry('project.json');
  if (!entry) throw new Error('exported package has no project.json');
  const projectJson = JSON.parse(zip.readAsText(entry));
  const guest = env.gmeConfig.authentication.guestAccount;
  const project = await env.storage.createProject({
    projectName: id + 'check',
    ownerId: guest,
    username: guest
  });
  const seeded = await env.storageUtils.insertProjectJson(project, projectJson, {
    branch: BRANCH,
    commitMessage: 'Re-import ' + id
  });
  const Core = webgme.requirejs('common/core/coreQ');
  const core = new Core(project, { globConf: env.gmeConfig, logger: env.logger.fork('check') });
  const commitObject = await Q.ninvoke(project, 'loadObject', seeded.hash);
  const root = await core.loadRoot(commitObject.root);
  const present = Object.values(core.getAllMetaNodes(root))
    .map((node) => core.getAttribute(node, 'name'))
    .filter(Boolean);
  const missing = expectedNames.filter((name) => !present.includes(name));
  if (missing.length) {
    throw new Error('re-import lost meta nodes: ' + missing.join(', '));
  }
  if (id === 'venn') {
    const children = await core.loadChildren(root);
    const intersection = children.find((node) => core.getAttribute(node, 'name') === 'Intersection');
    const sets = core.getOwnValidSetNames(intersection);
    const pointers = core.getOwnValidPointerNames(intersection);
    if (!sets.includes('members') || pointers.includes('members')) {
      throw new Error('Intersection.members is not a set after re-import');
    }
  }
}

async function exportWebgmex(project, gmeConfig, logger, blobClient, outFile) {
  const storageUtils = webgme.requirejs('common/storage/util');
  const blobUtil = webgme.requirejs('blob/util');
  const projectJson = await storageUtils.getProjectJson(project, { branchName: BRANCH });
  const blobHash = await blobUtil.buildProjectPackage(
    logger,
    blobClient,
    projectJson,
    false,
    path.basename(outFile)
  );
  const buffer = await blobClient.getObject(blobHash);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, buffer);
}

async function generateOne(env, id, emptyProject) {
  const languagePath = path.join(DIAGRAMS_ROOT, id, 'metamodel', 'Language.json');
  const outFile = path.join(DIAGRAMS_ROOT, id, 'metamodel', id + '.webgmex');
  const spec = JSON.parse(fs.readFileSync(languagePath, 'utf8'));
  const sep = webgme.requirejs('common/storage/constants').PROJECT_ID_SEP;
  const guest = env.gmeConfig.authentication.guestAccount;
  const project = await env.storage.createProject({
    projectName: id,
    ownerId: guest,
    username: guest,
    projectId: guest + sep + id
  });
  const seeded = await env.storageUtils.insertProjectJson(project, emptyProject, {
    branch: BRANCH,
    commitMessage: 'Seed empty project'
  });
  const applied = await applyLanguage(project, env.gmeConfig, env.logger, spec, seeded.hash);
  await exportWebgmex(project, env.gmeConfig, env.logger, env.blobClient, outFile);
  await verifyWritten(env, id, outFile, applied.expected);
  const written = fs.statSync(outFile).size;
  return { id, outFile, concepts: applied.concepts, bytes: written };
}

async function main() {
  const ids = languageIds(process.argv.slice(2).filter((arg) => arg !== '--'));
  const umdCheck = path.join(importerPackageRoot(), 'src', 'common', 'build', 'JSONImporter.umd.js');
  if (!fs.existsSync(umdCheck)) {
    throw new Error('Missing ' + umdCheck);
  }
  const blobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webgme-mdd-blob-'));
  const gmeConfig = makeConfig(blobDir);
  gmeConfig.server.log.transports[0].options.level = 'error';
  const logger = webgme.Logger.create('gme:mdd:webgmex', gmeConfig.server.log);
  const BlobClient = require('webgme-engine/src/server/middleware/blob/BlobClientWithFSBackend');
  const blobClient = new BlobClient(gmeConfig, logger.fork('blob'));
  const emptyProject = readSeedProject();
  const { storage, gmeAuth } = await openStorage(gmeConfig, logger);
  const env = {
    gmeConfig,
    logger,
    storage,
    blobClient,
    storageUtils: webgme.requirejs('common/storage/util')
  };
  const failures = [];
  try {
    for (const id of ids) {
      try {
        const result = await generateOne(env, id, emptyProject);
        const rel = path.relative(REPO_ROOT, result.outFile);
        console.log(result.id + '  ' + result.concepts + ' meta nodes  ' + rel + '  (' + result.bytes + ' bytes)');
      } catch (err) {
        failures.push(id + ': ' + (err && err.message ? err.message : err));
        console.error('FAIL', id, err && err.stack ? err.stack : err);
      }
    }
  } finally {
    await storage.closeDatabase();
    if (typeof gmeAuth.unload === 'function') await gmeAuth.unload();
    fs.rmSync(blobDir, { recursive: true, force: true });
  }
  if (failures.length) {
    console.error(failures.length + ' language(s) failed');
    process.exitCode = 1;
  } else {
    console.log(ids.length + ' webgmex file(s) written');
  }
}

module.exports = {
  BRANCH,
  DIAGRAMS_ROOT,
  REPO_ROOT,
  makeConfig,
  openStorage,
  readSeedProject,
  exportWebgmex
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
}
