# Pie Chart (`pie`)

WebGME project housing a DSML metamodel for Mermaid **Pie Chart**.

## Mermaid keywords

- `pie`

## Status

`stable`

## Domains

- data-visualization
- analytics
- reporting

## Capabilities

- Titled pie slices with numeric values
- Optional showData

## Syntax highlights

```mermaid
pie title Pets
"Dogs" : 386
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
