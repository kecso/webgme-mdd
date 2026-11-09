/*globals define*/
/*eslint-env node, browser*/

/**
 * Lightweight Mermaid source ↔ AST helpers.
 * Not a full grammar port — enough structure for WebGME import/export drafts
 * and faithful round-trip via stored mermaidSource when available.
 */
define([], function () {
    'use strict';

    const KEYWORD_TO_TYPE = {
        flowchart: 'flowchart',
        graph: 'flowchart',
        sequenceDiagram: 'sequence',
        classDiagram: 'class',
        stateDiagram: 'state',
        'stateDiagram-v2': 'state',
        erDiagram: 'er',
        journey: 'journey',
        gantt: 'gantt',
        pie: 'pie',
        quadrantChart: 'quadrant',
        requirementDiagram: 'requirement',
        gitGraph: 'gitgraph',
        C4Context: 'c4',
        C4Container: 'c4',
        C4Component: 'c4',
        C4Dynamic: 'c4',
        C4Deployment: 'c4',
        mindmap: 'mindmap',
        timeline: 'timeline',
        kanban: 'kanban',
        'sankey-beta': 'sankey',
        sankey: 'sankey',
        'xychart-beta': 'xychart',
        xychart: 'xychart',
        'block-beta': 'block',
        block: 'block',
        'packet-beta': 'packet',
        packet: 'packet',
        'architecture-beta': 'architecture',
        architecture: 'architecture',
        'radar-beta': 'radar',
        radar: 'radar',
        'treemap-beta': 'treemap',
        treemap: 'treemap',
        ishikawa: 'ishikawa',
        'ishikawa-beta': 'ishikawa',
        fishbone: 'ishikawa',
        'usecase-beta': 'usecase',
        usecase: 'usecase',
        'eventmodeling-beta': 'eventmodeling',
        eventmodeling: 'eventmodeling',
        venn: 'venn',
        treeView: 'treeview',
        'wardley-beta': 'wardley',
        wardley: 'wardley',
        cynefin: 'cynefin',
        railroad: 'railroad'
    };

    function stripComments(src) {
        return src
            .split('\n')
            .filter(function (line) {
                return !/^\s*%%/.test(line);
            })
            .join('\n');
    }

    function firstKeyword(src) {
        const cleaned = stripComments(src).trim();
        const token = cleaned.split(/\s+/)[0];
        return token;
    }

    function detectType(src) {
        const kw = firstKeyword(src);
        return KEYWORD_TO_TYPE[kw] || null;
    }

    function parseTitle(lines) {
        for (let i = 0; i < lines.length; i++) {
            const m = lines[i].match(/^\s*title\s+(.+)\s*$/i);
            if (m) return m[1].trim().replace(/^"|"$/g, '');
        }
        return null;
    }

    function parseFlowchart(src) {
        const lines = stripComments(src).split('\n');
        const header = lines[0] || '';
        const dirMatch = header.match(/^(?:flowchart|graph)\s+(\w+)/i);
        const nodes = {};
        const edges = [];
        const nodeRe = /([A-Za-z0-9_]+)(\[\[.*?\]\]|\(\(.*?\)\)|\[\([^]*?\)\]|\(\[.*?\]\)|\[\/.*?\/\]|\[\\.*?\\\]|\{\{.*?\}\}|\[.*?\]|\(.*?\)|\{.*?\}|\>.*?\]|\(\(.*?\)\)|>.*?\]|\[.*?\]|\([^]*?\))?/g;
        const edgeRe = /([A-Za-z0-9_]+)\s*(-?\.?-+>?|=+>|--+)\s*(?:\|([^|]*)\|\s*)?([A-Za-z0-9_]+)/;

        lines.slice(1).forEach(function (line, idx) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'end' || /^subgraph\b/i.test(trimmed)) return;
            const em = trimmed.match(edgeRe);
            if (em) {
                nodes[em[1]] = nodes[em[1]] || { id: em[1], label: em[1] };
                nodes[em[4]] = nodes[em[4]] || { id: em[4], label: em[4] };
                edges.push({
                    id: 'e' + idx,
                    src: em[1],
                    dst: em[4],
                    label: (em[3] || '').trim(),
                    lineStyle: em[2]
                });
                return;
            }
            let m;
            const re = new RegExp(nodeRe);
            while ((m = re.exec(trimmed)) !== null) {
                if (!m[1]) continue;
                nodes[m[1]] = {
                    id: m[1],
                    label: (m[2] || m[1]).replace(/^[\[\(\{\>]+|[\]\)\}]+$/g, '')
                };
            }
        });

        return {
            type: 'flowchart',
            name: 'Flowchart',
            title: parseTitle(lines),
            direction: dirMatch ? dirMatch[1] : 'TD',
            nodes: Object.keys(nodes).map(function (k) { return nodes[k]; }),
            edges: edges,
            raw: src
        };
    }

    function parseSequence(src) {
        const lines = stripComments(src).split('\n');
        const participants = {};
        const messages = [];
        lines.slice(1).forEach(function (line, idx) {
            const p = line.match(/^\s*(participant|actor)\s+(\S+)(?:\s+as\s+(.+))?\s*$/i);
            if (p) {
                participants[p[2]] = { id: p[2], alias: (p[3] || p[2]).trim(), kind: p[1].toLowerCase() };
                return;
            }
            const msg = line.match(/^\s*(\S+)\s*(-?>>?|-->>?|-x|--x|-\)|--\))\s*(\S+)\s*:\s*(.+)\s*$/);
            if (msg) {
                participants[msg[1]] = participants[msg[1]] || { id: msg[1], alias: msg[1], kind: 'participant' };
                participants[msg[3]] = participants[msg[3]] || { id: msg[3], alias: msg[3], kind: 'participant' };
                messages.push({
                    id: 'm' + idx,
                    from: msg[1],
                    to: msg[3],
                    arrowType: msg[2],
                    label: msg[4].trim()
                });
            }
        });
        return {
            type: 'sequence',
            name: 'Sequence',
            title: parseTitle(lines),
            participants: Object.keys(participants).map(function (k) { return participants[k]; }),
            messages: messages,
            raw: src
        };
    }

    function parseGeneric(src, type) {
        const lines = stripComments(src).split('\n');
        return {
            type: type,
            name: type,
            title: parseTitle(lines),
            lines: lines.slice(1).map(function (l) { return l.trim(); }).filter(Boolean),
            raw: src
        };
    }

    function parse(src, expectedType) {
        if (!src || !String(src).trim()) {
            throw new Error('Empty Mermaid source');
        }
        const detected = detectType(src);
        if (expectedType && detected && detected !== expectedType) {
            throw new Error('Expected diagram type "' + expectedType + '" but source starts as "' + detected + '"');
        }
        const type = expectedType || detected;
        if (!type) {
            throw new Error('Could not detect Mermaid diagram type from source');
        }
        if (type === 'flowchart') return parseFlowchart(src);
        if (type === 'sequence') return parseSequence(src);
        return parseGeneric(src, type);
    }

    function serializeFromCore(core, rootNode, byPath, diagramType) {
        const name = core.getAttribute(rootNode, 'name') || diagramType;
        const title = core.getAttribute(rootNode, 'title');
        const lines = [];

        const headerByType = {
            flowchart: 'flowchart TD',
            sequence: 'sequenceDiagram',
            class: 'classDiagram',
            state: 'stateDiagram-v2',
            er: 'erDiagram',
            journey: 'journey',
            gantt: 'gantt',
            pie: 'pie',
            quadrant: 'quadrantChart',
            requirement: 'requirementDiagram',
            gitgraph: 'gitGraph',
            c4: 'C4Context',
            mindmap: 'mindmap',
            timeline: 'timeline',
            kanban: 'kanban',
            sankey: 'sankey-beta',
            xychart: 'xychart-beta',
            block: 'block-beta',
            packet: 'packet-beta',
            architecture: 'architecture-beta',
            radar: 'radar-beta',
            treemap: 'treemap-beta',
            ishikawa: 'ishikawa-beta',
            usecase: 'usecase-beta',
            eventmodeling: 'eventmodeling-beta',
            venn: 'venn',
            treeview: 'treeView',
            wardley: 'wardley-beta',
            cynefin: 'cynefin',
            railroad: 'railroad'
        };

        lines.push(headerByType[diagramType] || diagramType);
        if (title) lines.push('  title ' + title);

        const children = core.getChildrenPaths(rootNode) || [];
        children.forEach(function (p) {
            const n = byPath[p];
            if (!n) return;
            const nName = core.getAttribute(n, 'name');
            const label = core.getAttribute(n, 'label') || nName;
            const metaName = (core.getAttribute(core.getBase(n), 'name') || '').toLowerCase();

            if (diagramType === 'flowchart') {
                if (metaName === 'edge') {
                    const src = core.getPointerPath(n, 'src');
                    const dst = core.getPointerPath(n, 'dst');
                    const s = src && byPath[src] ? core.getAttribute(byPath[src], 'name') : '?';
                    const d = dst && byPath[dst] ? core.getAttribute(byPath[dst], 'name') : '?';
                    const edgeLabel = core.getAttribute(n, 'label');
                    lines.push(edgeLabel ? ('  ' + s + ' -->|' + edgeLabel + '| ' + d) : ('  ' + s + ' --> ' + d));
                } else if (metaName === 'node') {
                    lines.push('  ' + nName + '[' + label + ']');
                }
            } else if (diagramType === 'sequence' && metaName === 'message') {
                const from = core.getPointerPath(n, 'from');
                const to = core.getPointerPath(n, 'to');
                const f = from && byPath[from] ? core.getAttribute(byPath[from], 'name') : '?';
                const t = to && byPath[to] ? core.getAttribute(byPath[to], 'name') : '?';
                lines.push('  ' + f + '->>' + t + ': ' + (label || ''));
            } else {
                lines.push('  %% ' + metaName + ': ' + label);
            }
        });

        lines.push('  %% exported from WebGME node ' + name);
        return lines.join('\n') + '\n';
    }

    return {
        KEYWORD_TO_TYPE: KEYWORD_TO_TYPE,
        detectType: detectType,
        parse: parse,
        serializeFromCore: serializeFromCore
    };
});
