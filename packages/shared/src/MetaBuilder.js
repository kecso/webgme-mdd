/*globals define*/
/*eslint-env node, browser*/

/**
 * Materialize a Mermaid AST into WebGME nodes using META bases.
 */
define([], function () {
    'use strict';

    function create(core, base, parent, attrs, position) {
        const node = core.createNode({ parent: parent, base: base });
        Object.keys(attrs || {}).forEach(function (key) {
            if (attrs[key] === undefined || attrs[key] === null) return;
            try {
                core.setAttribute(node, key, String(attrs[key]));
            } catch (e) {
                // Attribute may not exist on meta yet
            }
        });
        if (position) {
            core.setRegistry(node, 'position', position);
        }
        return node;
    }

    function materializeAst(core, META, diagramNode, ast) {
        let created = 0;
        const map = {};

        function base(name) {
            return META[name] || null;
        }

        if (ast.type === 'flowchart') {
            (ast.nodes || []).forEach(function (n, i) {
                const node = create(core, base('Node') || core.getBase(diagramNode), diagramNode, {
                    name: n.id,
                    label: n.label || n.id,
                    shape: n.shape || 'rect'
                }, { x: 80 + (i % 5) * 140, y: 80 + Math.floor(i / 5) * 100 });
                map[n.id] = node;
                created += 1;
            });
            (ast.edges || []).forEach(function (e, i) {
                const edge = create(core, base('Edge') || core.getBase(diagramNode), diagramNode, {
                    name: e.id || ('edge_' + i),
                    label: e.label || '',
                    lineStyle: e.lineStyle || '-->'
                }, { x: 120 + i * 40, y: 320 });
                if (map[e.src] && core.getPointerMeta && true) {
                    try { core.setPointer(edge, 'src', map[e.src]); } catch (err) { /* */ }
                    try { core.setPointer(edge, 'dst', map[e.dst]); } catch (err) { /* */ }
                }
                created += 1;
            });
            if (ast.direction) {
                try { core.setAttribute(diagramNode, 'direction', ast.direction); } catch (e) { /* */ }
            }
            return created;
        }

        if (ast.type === 'sequence') {
            (ast.participants || []).forEach(function (p, i) {
                map[p.id] = create(core, base('Participant') || core.getBase(diagramNode), diagramNode, {
                    name: p.id,
                    alias: p.alias || p.id,
                    kind: p.kind || 'participant'
                }, { x: 80 + i * 160, y: 60 });
                created += 1;
            });
            (ast.messages || []).forEach(function (m, i) {
                const msg = create(core, base('Message') || core.getBase(diagramNode), diagramNode, {
                    name: m.id || ('msg_' + i),
                    label: m.label || '',
                    arrowType: m.arrowType || '->>'
                }, { x: 100, y: 160 + i * 60 });
                try { if (map[m.from]) core.setPointer(msg, 'from', map[m.from]); } catch (e) { /* */ }
                try { if (map[m.to]) core.setPointer(msg, 'to', map[m.to]); } catch (e) { /* */ }
                created += 1;
            });
            return created;
        }

        // Generic: one child node per non-empty line for draft visibility
        (ast.lines || []).forEach(function (line, i) {
            const concept =
                base('Node') ||
                base('Task') ||
                base('Slice') ||
                base('Field') ||
                base('Item') ||
                base('Event') ||
                base('Component') ||
                base('Rule') ||
                core.getBase(diagramNode);
            create(core, concept, diagramNode, {
                name: 'line_' + i,
                label: line
            }, { x: 80, y: 80 + i * 40 });
            created += 1;
        });
        return created;
    }

    return {
        create: create,
        materializeAst: materializeAst
    };
});
