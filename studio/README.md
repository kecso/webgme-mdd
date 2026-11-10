# Markdown System Studio (MDSS)

Story-centered studio for multi-view system models as **Markdown / Mermaid / EARS**, with WebGME as the consistency backbone and a **browsable Markdown book** as the shareable deliverable.

Package id remains `@webgme-mdd/studio` inside the webgme-mdd monorepo.

This package is a **valid WebGME project** in the **webgme-dss** sense: `webgme-engine` host + registered routers/plugins + React SPA via `config.client.appDir` (classic visualizers left empty).

## Run

### UI-only (Vite demo store)

```bash
npm install   # from repo root
npm run studio
# → http://127.0.0.1:3947
```

Uses the local demo store and Vite `/api/*` disk middleware. No MongoDB required.

### WebGME host (engine + React)

Default storage is **in-memory** (no MongoDB). Projects vanish when the process exits.

```bash
npm install
npm run studio:build    # Vite → studio/public/app + copy gme-dist
npm run studio:start    # webgme-engine on :3988
# → http://127.0.0.1:3988
```

Or from this package:

```bash
cd studio
npm run build
npm start
```

Optional Mongo later:

```bash
# requires MongoDB
set NODE_ENV=mongo
npm start
```

## WebGME layout (DSS-shaped)

| Artifact | Role |
|----------|------|
| `webgme-setup.json` | Registers AppRouter, DomainManager; documents ImportMDD |
| `config/` | `client.appDir → ./public`, plugin basePaths for router + `diagrams/*/src/plugins` |
| `server.js` | Mongo wait + `webgme-engine` standaloneServer |
| `src/routers/AppRouter` | SPA fallback for `/p/:owner/:name` (+ book) |
| `src/routers/DomainManager` | seedInfo / catalog / createProject / updateProject |
| `public/index.html` | EJS shell: `gme.classes` + `onGMEInit` + Vite bundle |
| `public/app/` | Vite production build (`app.build.js`) |
| `public/gme-dist/` | Copied `webgme.classes.build.js` |

Diagram plugins are on `plugin.basePaths` so this host can run them like any other WebGME deployment. Plugin **ids still collide** across domains (`ImportMermaid`, etc.) until namespaced invoke lands — `ImportMDD` is the unique orchestrator id today.

`DomainManager.createProject` seeds **EmptyProject** with `kind: MDSS:<domains>`. Real domain libraries / DomainSelector-analogue wait on MDD seeds.

Default `config.storage.database.type = 'memory'` + `memorygmeauth` — switch with `NODE_ENV=mongo` when you want persistence.

## Product shape

| Piece | Role |
|-------|------|
| Welcome / Projects | DSS-style shell; projects can bind a **story** (e.g. S1) |
| Domains | Enable **modeling domains** (not a flat diagram-type checklist) |
| Overview | Project aspect listing instances by modeling domain |
| New diagram | Floating multi-step: domain → view language (coupling) → name |
| Canvas | Mermaid/EARS view + selection overlay → DiagramControl |
| Monaco source | Hideable on canvas; **Apply** is manual (ImportDelta TODO) |
| **Export book** | `README` + `SUMMARY` + `chapters/*.md` + `traces.md`; preview at `/p/:owner/:name/book` |

See [`docs/findings/product-positioning.md`](../docs/findings/product-positioning.md) and [`docs/findings/editor-architecture.md`](../docs/findings/editor-architecture.md).

## S1 demo seed

`demo+s1-aeb` loads story-shaped Mermaid/EARS fixtures from `src/data/s1DemoSeed.js` (ears, requirement, usecase, c4, architecture, class, state, two sequences, flowchart, er + soft correspondences). No WebGME seeds required. Use **Reset S1 seed** on the Projects page if localStorage still has an empty project.

## Intentional TODOs

- Zip download of real folder layout (currently a concatenated `.mdbundle.txt`)
- Seed empty chapters from story templates when domains are enabled
- WebGME export plugin → blob/repo; mdBook/Pages publish
- Richer MD renderer; Integrating traces filled from Core
- Domain seeds + DomainSelector-analogue (library sync)
- Namespaced diagram plugin ids for ImportMermaid / Export*
- ImportDelta (unchanged from view-first studio plan)
- Validation strip + Assist LLM — see [`docs/findings/validation-and-llm.md`](../docs/findings/validation-and-llm.md)
