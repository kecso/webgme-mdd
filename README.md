# webgme-mdd

Monorepo that surveys **all current Mermaid diagram families** and packages each one as a **WebGME-shaped DSML project** with:

- draft metamodels in [webgme-json](https://github.com/deepforge-dev/webgme-json-importer) format (`metamodel/Language.json`)
- Core API **ImportMermaid** / **ExportMermaid** plugins
- **ApplyLanguageMeta** to load the JSON META into a project
- domain index for choosing which languages to build first

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
scripts/
  diagram-catalog.json  Canonical inventory + domain index
  generate-diagram-projects.js
packages/shared/        AMD + CJS helpers (MermaidAst, JsonMetaImporter, MetaBuilder)
diagrams/<id>/          One webgme-cli-style project per diagram
catalog/                Vite explorer UI
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

## Suggested metamodel waves

- **A:** flowchart, sequence, class, state, er, c4, requirement  
- **B:** gantt, kanban, journey, timeline, gitgraph  
- **C:** pie, xychart, sankey, quadrant, radar, treemap  
- **D–E:** remaining beta/experimental families (already scaffolded)

## Notes

- Parsers in `@webgme-mdd/shared` are **drafts** (specialized for flowchart/sequence; generic line AST otherwise). Lossless export prefers the stored `mermaidSource`.
- Experimental Mermaid types may not render in every Mermaid build; META drafts are still provided so WebGME languages can lead.
- Survey references Mermaid public docs / examples (11.x–12.x era, Nov 2026).
