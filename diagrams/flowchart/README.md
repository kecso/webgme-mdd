# Flowchart (`flowchart`)

WebGME project housing a DSML metamodel for Mermaid **Flowchart**.

## Mermaid keywords

- `flowchart`
- `graph`

## Status

`stable`

## Domains

- process-modeling
- algorithms
- workflows
- ci-cd
- business-process

## Capabilities

- Directed graphs with ranked layout (TD/TB/LR/RL/BT)
- Many node shapes (rect, diamond, stadium, cylinder, hexagon, etc.)
- Labeled edges, dotted/thick styles, link clicks
- Subgraphs / clusters
- Styling classes and inline styles

## Syntax highlights

```mermaid
flowchart TD
A[Process] --> B{Decision?}
B -->|Yes| C([End])
subgraph id[Title] ... end
```

## Layout

| Path | Purpose |
|------|---------|
| `metamodel/Language.json` | webgme-json metamodel draft |
| `examples/sample.mmd` | Canonical Mermaid sample |
| `src/plugins/ImportMermaid` | Mermaid text → model |
| `src/plugins/ExportMermaid` | model → Mermaid text |
| `src/plugins/ApplyLanguageMeta` | Apply Language.json via Core |

## Run (requires MongoDB)

```bash
npm install
# from repo root or this package after workspace install
npm start
```

Then open the configured WebGME port, create a project from this seed/language, run **ApplyLanguageMeta**, then **ImportMermaid**.
