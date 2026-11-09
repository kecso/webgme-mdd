/*globals define*/
/*eslint-env node, browser*/

/**
 * Minimal webgme-json compatible Language importer.
 * Spec subset aligned with deepforge-dev/webgme-json-importer:
 * attributes, attribute_meta, children_meta, pointer_meta, registry, children, id (@meta:Name)
 */
define([], function () {
    'use strict';

    function findChildByName(core, parent, name) {
        const paths = core.getChildrenPaths(parent) || [];
        // Synchronous path-only search is insufficient; caller should load children.
        return null;
    }

    function ensureMetaChild(core, root, parent, name, existingByName) {
        if (existingByName[name]) {
            return { node: existingByName[name], created: false };
        }
        // Base new meta nodes on FCO when available
        let fco = null;
        const rootChildren = existingByName.__rootChildren || [];
        // Plugin META map may already expose FCO
        const node = core.createNode({
            parent: parent,
            base: existingByName.FCO || null
        });
        core.setAttribute(node, 'name', name);
        // Mark as meta by adding to META sheet via setAttribute meta rules on parent containment
        existingByName[name] = node;
        return { node: node, created: true };
    }

    function applyAttributeMeta(core, node, attributeMeta) {
        Object.keys(attributeMeta || {}).forEach(function (attr) {
            const def = attributeMeta[attr] || {};
            const type = def.type || 'string';
            // Ensure attribute exists with default
            if (core.getAttribute(node, attr) === undefined) {
                core.setAttribute(node, attr, def.default != null ? def.default : (type === 'integer' ? 0 : ''));
            }
            if (typeof core.setAttributeMeta === 'function') {
                core.setAttributeMeta(node, attr, { type: type });
            }
        });
    }

    function applyPointerMeta(core, node, pointerMeta, resolve) {
        Object.keys(pointerMeta || {}).forEach(function (ptr) {
            const def = pointerMeta[ptr];
            if (typeof core.setPointerMetaTarget !== 'function') return;
            const min = def.min != null ? def.min : -1;
            const max = def.max != null ? def.max : 1;
            Object.keys(def).forEach(function (key) {
                if (key === 'min' || key === 'max') return;
                const target = resolve(key);
                if (!target) return;
                const tmin = def[key].min != null ? def[key].min : -1;
                const tmax = def[key].max != null ? def[key].max : 1;
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
        if (typeof core.setChildrenMetaLimits === 'function') {
            core.setChildrenMetaLimits(
                node,
                childrenMeta.min != null ? childrenMeta.min : -1,
                childrenMeta.max != null ? childrenMeta.max : -1
            );
        }
    }

    /**
     * @returns {Promise<{created:number, updated:number}>}
     */
    function apply(core, rootNode, activeNode, spec, META) {
        META = META || {};
        const parent = activeNode || rootNode;
        const summary = { created: 0, updated: 0 };

        return core.loadChildren(parent).then(function (children) {
            const byName = Object.assign({}, META);
            children.forEach(function (ch) {
                byName[core.getAttribute(ch, 'name')] = ch;
            });
            if (META.FCO) byName.FCO = META.FCO;

            // Optionally set parent name
            if (spec.attributes && spec.attributes.name) {
                core.setAttribute(parent, 'name', spec.attributes.name);
            }
            applyAttributeMeta(core, parent, spec.attribute_meta);
            if (spec.registry) {
                Object.keys(spec.registry).forEach(function (k) {
                    core.setRegistry(parent, k, spec.registry[k]);
                });
            }

            const childSpecs = spec.children || [];
            // First pass: create nodes
            childSpecs.forEach(function (childSpec, idx) {
                const metaId = childSpec.id || '';
                const name = metaId.indexOf('@meta:') === 0
                    ? metaId.substring(6)
                    : (childSpec.attributes && childSpec.attributes.name) || ('Meta' + idx);
                const result = ensureMetaChild(core, rootNode, parent, name, byName);
                if (result.created) summary.created += 1;
                else summary.updated += 1;

                if (childSpec.attributes) {
                    Object.keys(childSpec.attributes).forEach(function (a) {
                        core.setAttribute(result.node, a, childSpec.attributes[a]);
                    });
                }
                applyAttributeMeta(core, result.node, childSpec.attribute_meta);
                if (childSpec.registry && childSpec.registry.position) {
                    core.setRegistry(result.node, 'position', childSpec.registry.position);
                }
                byName[name] = result.node;
            });

            function resolve(idOrName) {
                if (!idOrName) return null;
                if (idOrName.indexOf('@meta:') === 0) {
                    return byName[idOrName.substring(6)] || null;
                }
                return byName[idOrName] || null;
            }

            // Second pass: relationships / containment rules
            applyChildrenMeta(core, parent, spec.children_meta, resolve);
            childSpecs.forEach(function (childSpec) {
                const metaId = childSpec.id || '';
                const name = metaId.indexOf('@meta:') === 0
                    ? metaId.substring(6)
                    : (childSpec.attributes && childSpec.attributes.name);
                const node = byName[name];
                if (!node) return;
                applyChildrenMeta(core, node, childSpec.children_meta, resolve);
                applyPointerMeta(core, node, childSpec.pointer_meta, resolve);
            });

            // Expose on META sheet of ROOT when possible
            if (typeof core.addMember === 'function') {
                try {
                    const metaAspect = 'MetaAspectSet';
                    Object.keys(byName).forEach(function (name) {
                        if (name === 'FCO' || name.indexOf('__') === 0) return;
                        const n = byName[name];
                        if (!n || n === parent) return;
                        try {
                            core.addMember(rootNode, metaAspect, n);
                        } catch (e) {
                            // Different WebGME versions use different meta aspect names
                        }
                    });
                } catch (e) {
                    // ignore
                }
            }

            return summary;
        });
    }

    return {
        apply: apply
    };
});
