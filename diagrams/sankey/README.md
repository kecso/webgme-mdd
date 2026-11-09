# Sankey Diagram (`sankey`)

WebGME project housing a DSML metamodel for Mermaid **Sankey Diagram**.

## Mermaid keywords

- `sankey`
- `sankey-beta`

## Status

`beta`

## Domains

- flow-analysis
- energy
- budget
- conversion-funnels

## Capabilities

- Weighted source-target flows
- CSV-like link rows

## Syntax highlights

```mermaid
sankey-beta
Source,Target,Value
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
