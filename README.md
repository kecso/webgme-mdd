# webgme-mdd

Monorepo that surveys **all current Mermaid diagram families** and packages each one as a **WebGME-shaped DSML project** with:

- draft metamodels in [webgme-json](https://github.com/deepforge-dev/webgme-json-importer) format (`metamodel/Language.json`)
- Core API **ImportMermaid** / **ExportMermaid** plugins
- **ApplyLanguageMeta** to load the JSON META into a project
- domain index for choosing which languages to build first
- companion **EARS** requirements body language (`diagrams/ears`) — not Mermaid; pairs with `requirementDiagram` for traceability

## Quick start (findings browser)

```bash
npm install
npm run catalog
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847) — filter diagrams, inspect domains/capabilities, preview samples, and read `Language.json` excerpts.

```bash
npm test          # validate generated diagram projects
npm run generate  # regenerate diagrams/* from scripts/diagram-catalog.json
```

## Repository layout

```
docs/findings/          Survey write-ups (catalog, syntax, domains, JSON format)
docs/stories/           Multi-domain integrated validation stories
scripts/
  diagram-catalog.json  Canonical inventory + domain index
  generate-diagram-projects.js
  generate-domain-registry.js
packages/shared/        AMD + CJS helpers (MermaidAst, EarsAst, JsonMetaImporter, MetaBuilder)
diagrams/<id>/          One webgme-cli-style project per diagram (+ `ears` companion)
router/                 WebGME router app — ImportMDD orchestrates libraries + importers
lean/                   Integrating Language + cross-domain Lean proofs (webgme-lean fashion)
catalog/                Vite explorer UI
```

## Router (ImportMDD)

`router/` is a WebGME project whose **ImportMDD** plugin:

1. Detects Mermaid diagram type(s) in the input (multi-doc via `---` separators)
2. Ensures each required domain is imported as a **library** (`core.addLibrary` — TODOs until seeds exist)
3. Invokes each domain’s **ImportMermaid** via `invokePlugin` (TODOs for qualified plugin ids / namespaces)

```bash
npm run generate:registry   # refresh router DomainRegistry.json from the catalog
cd router && npm start      # WebGME on port 3888
```

## Diagram projects (WebGME)

Each `diagrams/<id>/` directory mirrors a `webgme init` app:

| Path | Role |
|------|------|
| `metamodel/Language.json` | META draft (webgme-json) |
| `metamodel/descriptor.json` | Tooling summary |
| `examples/sample.mmd` | Canonical Mermaid sample |
| `src/plugins/ImportMermaid` | Mermaid text → model (Core) |
| `src/plugins/ExportMermaid` | model → `.mmd` artifact |
| `src/plugins/ApplyLanguageMeta` | Apply `Language.json` |

### Run a single WebGME diagram app

Requires **Node**, **MongoDB**, and `webgme`:

```bash
npm install
cd diagrams/flowchart
npm install webgme   # if peer dep not hoisted in your npm version
npm start
```

In the editor: create/open a project → run **ApplyLanguageMeta** on a Language folder → run **ImportMermaid** with the sample source → **ExportMermaid** to round-trip.

You can also import `Language.json` with upstream **webgme-json-importer** (`SetStateFromJSON`) for full sync semantics.

## Findings (start here)

1. [Diagram catalog](docs/findings/diagram-catalog.md) — all 30 families  
2. [Syntax & capabilities](docs/findings/syntax-capabilities.md)  
3. [Target domains](docs/findings/domains.md) — for META prioritization  
4. [webgme-json format notes](docs/findings/webgme-json-format.md)  
5. [Multi-domain validation stories](docs/stories/README.md) — literature/industrial scenarios that need cross-diagram consistency checks  
6. [Integration architecture](docs/findings/integration-architecture.md) — generic Integrating Language vs domain×domain; how constraints span diagrams  
7. [Lean formalization](docs/findings/lean-formalization.md) — webgme-lean-style META→Lean beside domains + S1 cross-domain proof  
8. [Requirements specification](docs/findings/requirements-specification.md) — why Mermaid `requirementDiagram` is not enough; **EARS** as the body language

## Suggested metamodel waves

- **A:** flowchart, sequence, class, state, er, c4, requirement + **ears** (companion)  
- **B:** gantt, kanban, journey, timeline, gitgraph  
- **C:** pie, xychart, sankey, quadrant, radar, treemap  
- **D–E:** remaining beta/experimental families (already scaffolded)

## Notes

- Parsers in `@webgme-mdd/shared` are **drafts** (specialized for flowchart/sequence; generic line AST otherwise). Lossless export prefers the stored `mermaidSource`.
- Experimental Mermaid types may not render in every Mermaid build; META drafts are still provided so WebGME languages can lead.
- Survey references Mermaid public docs / examples (11.x–12.x era, Nov 2026).
