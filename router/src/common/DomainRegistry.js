/*globals define*/
/*eslint-env node, browser*/

/**
 * Lookup helpers for Mermaid diagram domain → WebGME library / plugin mapping.
 */
define([
    'text!./DomainRegistry.json'
], function (registryText) {
    'use strict';

    const registry = JSON.parse(registryText);
    const byId = {};
    const byKeyword = {};

    registry.domains.forEach(function (domain) {
        byId[domain.id] = domain;
        (domain.keywords || []).forEach(function (kw) {
            byKeyword[kw] = domain;
        });
    });

    function getAll() {
        return registry.domains.slice();
    }

    function getById(id) {
        return byId[id] || null;
    }

    function getByKeyword(keyword) {
        return byKeyword[keyword] || null;
    }

    /**
     * Detect diagram / companion domain from source.
     * Mermaid: first non-comment keyword token.
     * EARS: REQ-* header lines or an `ears` keyword.
     * @param {string} source
     * @returns {object|null} domain entry
     */
    function detectFromSource(source) {
        if (!source || !String(source).trim()) {
            return null;
        }
        const lines = String(source).split(/\r?\n/);
        let sawEarsHeader = false;
        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i].trim();
            if (!line || line.indexOf('%%') === 0 || line.indexOf('#') === 0) {
                continue;
            }
            // Optional YAML frontmatter — skip until closing ---
            if (i === 0 && line === '---') {
                continue;
            }
            if (/^REQ[\w.-]+/i.test(line)) {
                sawEarsHeader = true;
                continue;
            }
            const token = line.split(/\s+/)[0];
            if (byKeyword[token]) {
                return byKeyword[token];
            }
            // C4* keywords are exact; flowchart/graph already covered
            if (!sawEarsHeader) {
                return null;
            }
        }
        if (sawEarsHeader && byId.ears) {
            return byId.ears;
        }
        return null;
    }

    /**
     * Split a multi-document Mermaid blob on lines that are only `---`
     * (not YAML frontmatter at start). Falls back to a single document.
     * @param {string} source
     * @returns {string[]}
     */
    function splitDocuments(source) {
        const text = String(source || '');
        if (!text.trim()) {
            return [];
        }
        // Documents separated by a line containing only --- after content started
        const parts = [];
        let current = [];
        let started = false;
        text.split(/\r?\n/).forEach(function (line) {
            if (line.trim() === '---' && started && current.length) {
                parts.push(current.join('\n'));
                current = [];
                return;
            }
            if (line.trim()) {
                started = true;
            }
            current.push(line);
        });
        if (current.length) {
            parts.push(current.join('\n'));
        }
        return parts.filter(function (p) {
            return p.trim().length > 0;
        });
    }

    return {
        registry: registry,
        getAll: getAll,
        getById: getById,
        getByKeyword: getByKeyword,
        detectFromSource: detectFromSource,
        splitDocuments: splitDocuments
    };
});
