# Quadrant Chart (`quadrant`)

WebGME project housing a DSML metamodel for Mermaid **Quadrant Chart**.

## Mermaid keywords

- `quadrantChart`

## Status

`stable`

## Domains

- strategy
- prioritization
- product-portfolio
- marketing-analysis

## Capabilities

- 2x2 grid with axis labels
- Named quadrant regions
- Points with [x,y] in 0..1

## Syntax highlights

```mermaid
quadrantChart
x-axis Low --> High
Campaign A: [0.3, 0.6]
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
