# `@webgme-mdd/router`

WebGME project that **routes** Mermaid MDD imports across diagram-specific domain packages.

## Role

`ImportMDD` is the orchestration plugin:

1. Detect which Mermaid diagram type(s) are in the input.
2. Ensure each required domain is present as a **library** in the active project.
3. Invoke the diagram-specific `ImportMermaid` plugin for each detected type.

Library seed / project IDs are still placeholders (`TODO`s) until real WebGME domain seeds exist under `diagrams/<id>/`.

## Layout

| Path | Purpose |
|------|---------|
| `src/plugins/ImportMDD` | Orchestrator plugin |
| `src/common/DomainRegistry.json` | Diagram id → library / seed / plugin mapping |
| `src/common/DomainRegistry.js` | Lookup helpers (AMD) |
| `examples/` | Multi-domain Mermaid samples |

## Run

```bash
# from monorepo root
npm install
cd router
npm start
```

Requires MongoDB. Then run **ImportMDD** from the WebGME UI (or `npm run plugin`).

## Related

- Diagram packages: `diagrams/<id>/`
- Shared AST helpers: `packages/shared`
- Multi-domain stories: `docs/stories/`
