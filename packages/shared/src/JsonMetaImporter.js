/*globals define*/
/*eslint-env node, browser*/

/**
 * Apply a Language document onto a WebGME node.
 * Accepts a webgme-json-importer project (ROOT / FCO / concepts, guid keys)
 * and the earlier @meta:Name draft.
 */
define([], function () {
    'use strict';

    function isImporterDocument(spec) {
        return !!(spec && spec.guid && spec.pointers && spec.attributes && spec.attributes.name === 'ROOT');
    }

    function nodeName(childSpec, idx) {
        if (childSpec.attributes && childSpec.attributes.name) return childSpec.attributes.name;
        const metaId = childSpec.id || '';
        if (metaId.indexOf('@meta:') === 0) return metaId.substring(6);
        return 'Meta' + idx;
    }

    function ensureMetaChild(core, parent, name, base, existingByName) {
        if (existingByName[name]) {
            return { node: existingByName[name], created: false };
        }
        const node = core.createNode({
            parent: parent,
            base: base || null
        });
        core.setAttribute(node, 'name', name);
        existingByName[name] = node;
        return { node: node, created: true };
    }

    function applyAttributeMeta(core, node, attributeMeta) {
        Object.keys(attributeMeta || {}).forEach(function (attr) {
            const def = attributeMeta[attr] || {};
            const type = def.type || 'string';
            if (core.getAttribute(node, attr) === undefined) {
                const fallback = def.default != null ? def.default : (type === 'integer' ? 0 : '');
                core.setAttribute(node, attr, fallback);
            }
            if (typeof core.setAttributeMeta === 'function') {
                core.setAttributeMeta(node, attr, { type: type });
            }
        });
    }

    function applyPointerMeta(core, node, pointerMeta, resolve) {
        Object.keys(pointerMeta || {}).forEach(function (ptr) {
            const def = pointerMeta[ptr];
            if (!def || typeof core.setPointerMetaTarget !== 'function') return;
            const min = def.min != null ? def.min : -1;
            const max = def.max != null ? def.max : 1;
            Object.keys(def).forEach(function (key) {
                if (key === 'min' || key === 'max') return;
                const target = resolve(key);
                if (!target) return;
                const rule = def[key] || {};
                const tmin = rule.min != null ? rule.min : -1;
                const tmax = rule.max != null ? rule.max : 1;
                core.setPointerMetaTarget(node, ptr, target, tmin, tmax);
            });
            if (typeof core.setPointerMetaLimits === 'function') {
                core.setPointerMetaLimits(node, ptr, min, max);
            }
        });
    }

    function applyChildrenMeta(core, node, childrenMeta, resolve) {
        if (!childrenMeta) return;
        Object.keys(childrenMeta).forEach(function (key) {
            if (key === 'min' || key === 'max') return;
            const target = resolve(key);
            if (!target) return;
            const lim = childrenMeta[key] || {};
            if (typeof core.setChildMeta === 'function') {
                core.setChildMeta(node, target, lim.min != null ? lim.min : -1, lim.max != null ? lim.max : -1);
            }
        });
        if (typeof core.setChildrenMetaLimits === 'function' && (childrenMeta.min != null || childrenMeta.max != null)) {
            core.setChildrenMetaLimits(
                node,
                childrenMeta.min != null ? childrenMeta.min : -1,
                childrenMeta.max != null ? childrenMeta.max : -1
            );
        }
    }

    function applyRegistry(core, node, registry, skip) {
        Object.keys(registry || {}).forEach(function (key) {
            if (skip && skip[key]) return;
            core.setRegistry(node, key, registry[key]);
        });
    }

    function remember(byName, byGuid, name, guid, node) {
        if (name) byName[name] = node;
        if (guid) byGuid[guid] = node;
    }

    function resolveId(byName, byGuid, idOrName) {
        if (!idOrName) return null;
        if (byGuid[idOrName]) return byGuid[idOrName];
        if (idOrName.indexOf('@meta:') === 0) return byName[idOrName.substring(6)] || null;
        return byName[idOrName] || null;
    }

    function addSetMembers(core, rootNode, spec, byGuid) {
        if (typeof core.addMember !== 'function') return;
        const sets = spec.sets || {};
        const names = Object.keys(sets);
        if (!names.length) {
            Object.keys(byGuid).forEach(function (guid) {
                const node = byGuid[guid];
                if (!node) return;
                try { core.addMember(rootNode, 'MetaAspectSet', node); } catch (e) { /* version skew */ }
            });
            return;
        }
        names.forEach(function (setName) {
            (sets[setName] || []).forEach(function (memberGuid) {
                const member = byGuid[memberGuid];
                if (!member) return;
                try { core.addMember(rootNode, setName, member); } catch (e) { /* version skew */ }
                const entry = spec.member_registry && spec.member_registry[setName] && spec.member_registry[setName][memberGuid];
                if (entry && entry.position && typeof core.setMemberRegistry === 'function') {
                    try {
                        core.setMemberRegistry(rootNode, setName, member, 'position', entry.position);
                    } catch (e2) { /* version skew */ }
                }
            });
        });
    }

    function applyLegacy(core, rootNode, parent, spec, META, summary) {
        return core.loadChildren(parent).then(function (children) {
            const byName = Object.assign({}, META);
            const byGuid = {};
            children.forEach(function (ch) {
                byName[core.getAttribute(ch, 'name')] = ch;
            });
            if (META.FCO) byName.FCO = META.FCO;

            if (spec.attributes && spec.attributes.name && spec.attributes.name !== 'ROOT') {
                core.setAttribute(parent, 'name', spec.attributes.name);
            }
            applyAttributeMeta(core, parent, spec.attribute_meta);
            applyRegistry(core, parent, spec.registry);

            (spec.children || []).forEach(function (childSpec, idx) {
                const name = nodeName(childSpec, idx);
                const base = name === 'FCO' ? null : (byName.FCO || META.FCO || null);
                const result = ensureMetaChild(core, parent, name, base, byName);
                if (result.created) summary.created += 1;
                else summary.updated += 1;
                if (childSpec.attributes) {
                    Object.keys(childSpec.attributes).forEach(function (attr) {
                        core.setAttribute(result.node, attr, childSpec.attributes[attr]);
                    });
                }
                applyAttributeMeta(core, result.node, childSpec.attribute_meta);
                if (childSpec.registry && childSpec.registry.position) {
                    core.setRegistry(result.node, 'position', childSpec.registry.position);
                }
                remember(byName, byGuid, name, childSpec.guid, result.node);
            });

            const resolve = function (idOrName) {
                return resolveId(byName, byGuid, idOrName);
            };
            applyChildrenMeta(core, parent, spec.children_meta, resolve);
            (spec.children || []).forEach(function (childSpec, idx) {
                const node = byName[nodeName(childSpec, idx)];
                if (!node) return;
                applyChildrenMeta(core, node, childSpec.children_meta, resolve);
                applyPointerMeta(core, node, childSpec.pointer_meta, resolve);
            });
            addSetMembers(core, rootNode, { sets: {} }, byGuid);
            return summary;
        });
    }

    function applyImporter(core, rootNode, parent, spec, META, summary) {
        return core.loadChildren(parent).then(function (children) {
            const byName = Object.assign({}, META);
            const byGuid = {};
            children.forEach(function (ch) {
                byName[core.getAttribute(ch, 'name')] = ch;
            });
            if (META.FCO) byName.FCO = META.FCO;

            applyAttributeMeta(core, parent, spec.attribute_meta);
            applyRegistry(core, parent, spec.registry, { ProjectRegistry: true });

            const childSpecs = (spec.children || []).slice().sort(function (a, b) {
                const aFco = nodeName(a, 0) === 'FCO' ? 0 : 1;
                const bFco = nodeName(b, 0) === 'FCO' ? 0 : 1;
                return aFco - bFco;
            });

            childSpecs.forEach(function (childSpec, idx) {
                const name = nodeName(childSpec, idx);
                if (name === 'FCO' && (META.FCO || byName.FCO)) {
                    remember(byName, byGuid, 'FCO', childSpec.guid, META.FCO || byName.FCO);
                    summary.updated += 1;
                    return;
                }
                const baseRef = childSpec.pointers && childSpec.pointers.base;
                const base = baseRef ? (byGuid[baseRef] || null) : (name === 'FCO' ? null : (byName.FCO || null));
                const result = ensureMetaChild(core, parent, name, base, byName);
                if (result.created) summary.created += 1;
                else summary.updated += 1;
                if (childSpec.guid && typeof core.setGuid === 'function') {
                    try { core.setGuid(result.node, childSpec.guid); } catch (e) { /* optional */ }
                }
                if (childSpec.attributes) {
                    Object.keys(childSpec.attributes).forEach(function (attr) {
                        core.setAttribute(result.node, attr, childSpec.attributes[attr]);
                    });
                }
                applyAttributeMeta(core, result.node, childSpec.attribute_meta);
                applyRegistry(core, result.node, childSpec.registry);
                remember(byName, byGuid, name, childSpec.guid, result.node);
            });

            const resolve = function (idOrName) {
                return resolveId(byName, byGuid, idOrName);
            };
            applyChildrenMeta(core, parent, spec.children_meta, resolve);
            childSpecs.forEach(function (childSpec, idx) {
                const name = nodeName(childSpec, idx);
                if (name === 'FCO' && (META.FCO || byName.FCO) && byGuid[childSpec.guid] === (META.FCO || byName.FCO)) {
                    return;
                }
                const node = childSpec.guid ? byGuid[childSpec.guid] : byName[name];
                if (!node) return;
                applyChildrenMeta(core, node, childSpec.children_meta, resolve);
                applyPointerMeta(core, node, childSpec.pointer_meta, resolve);
            });

            // The library document allows FCO under ROOT. The node this language
            // is applied to also has to contain the diagram concept itself.
            childSpecs.forEach(function (childSpec) {
                const plugins = childSpec.registry && childSpec.registry.validPlugins;
                if (!plugins || typeof core.setChildMeta !== 'function') return;
                const diagramNode = byGuid[childSpec.guid];
                if (!diagramNode) return;
                core.setChildMeta(parent, diagramNode, -1, -1);
            });

            addSetMembers(core, rootNode, spec, byGuid);
            return summary;
        });
    }

    /**
     * @returns {Promise<{created:number, updated:number}>}
     */
    function apply(core, rootNode, activeNode, spec, META) {
        META = META || {};
        const parent = activeNode || rootNode;
        const summary = { created: 0, updated: 0 };
        if (isImporterDocument(spec)) {
            return applyImporter(core, rootNode, parent, spec, META, summary);
        }
        return applyLegacy(core, rootNode, parent, spec, META, summary);
    }

    return {
        apply: apply
    };
});
