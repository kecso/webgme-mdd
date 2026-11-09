/*jshint node:true, mocha:true*/
/**
 * Structural / unit checks for ImportMDD planning helpers.
 * Full plugin execution requires MongoDB + registered domain seeds.
 */
describe('ImportMDD', function () {
    'use strict';

    var path = require('path');
    var fs = require('fs');

    it('DomainRegistry.json lists all diagram domains', function () {
        var registry = JSON.parse(fs.readFileSync(
            path.join(__dirname, '../../../src/common/DomainRegistry.json'),
            'utf8'
        ));
        if (!registry.domains || registry.domains.length < 1) {
            throw new Error('expected domains');
        }
        registry.domains.forEach(function (d) {
            if (!d.id || !d.libraryName || !d.importPluginId) {
                throw new Error('incomplete domain entry: ' + JSON.stringify(d));
            }
        });
    });

    it('detects flowchart and sequence keywords', function () {
        // Lightweight detect without AMD
        var registry = JSON.parse(fs.readFileSync(
            path.join(__dirname, '../../../src/common/DomainRegistry.json'),
            'utf8'
        ));
        var byKeyword = {};
        registry.domains.forEach(function (d) {
            (d.keywords || []).forEach(function (kw) {
                byKeyword[kw] = d.id;
            });
        });
        if (byKeyword.flowchart !== 'flowchart') {
            throw new Error('flowchart keyword missing');
        }
        if (byKeyword.sequenceDiagram !== 'sequence') {
            throw new Error('sequenceDiagram keyword missing');
        }
    });
});
