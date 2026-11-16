'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

require('webgme');
const MemoryMetadataStorage = require('../scripts/gme-memory-auth/memorymetadatastorage');

test('listing projects does not erase stored info', async () => {
  const storage = new MemoryMetadataStorage({ fork: () => ({}) });
  const projectId = await storage.addProject('guest', 'imported', {
    createdAt: '2020-01-01T00:00:00.000Z',
    kind: 'MDSS:'
  });
  const listed = await storage.getProjects();
  delete listed[0].info;
  delete listed[0].hooks;

  const updated = await storage.updateProjectInfo(projectId, {
    viewedAt: '2020-02-01T00:00:00.000Z',
    viewer: 'guest'
  });
  assert.equal(updated.info.createdAt, '2020-01-01T00:00:00.000Z');
  assert.equal(updated.info.viewedAt, '2020-02-01T00:00:00.000Z');
  assert.equal(updated.info.kind, 'MDSS:');

  const again = await storage.getProject(projectId);
  assert.equal(again.info.createdAt, '2020-01-01T00:00:00.000Z');
});
