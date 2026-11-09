# XY Chart (`xychart`)

WebGME project housing a DSML metamodel for Mermaid **XY Chart**.

## Mermaid keywords

- `xychart`
- `xychart-beta`

## Status

`beta`

## Domains

- data-visualization
- analytics
- timeseries

## Capabilities

- Bar and line series
- Categorical or numeric axes
- Titles and axis labels

## Syntax highlights

```mermaid
xychart-beta
x-axis [...]
bar [...]
line [...]
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
