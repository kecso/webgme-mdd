# Treemap (`treemap`)

WebGME project housing a DSML metamodel for Mermaid **Treemap**.

## Mermaid keywords

- `treemap`
- `treemap-beta`

## Status

`beta`

## Domains

- hierarchies
- disk-usage
- budget-breakdown
- portfolio

## Capabilities

- Nested hierarchical areas
- Numeric values drive area

## Syntax highlights

```mermaid
treemap-beta
"Root"
  "Child": 10
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
