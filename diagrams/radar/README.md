# Radar Chart (`radar`)

WebGME project housing a DSML metamodel for Mermaid **Radar Chart**.

## Mermaid keywords

- `radar`
- `radar-beta`

## Status

`beta`

## Domains

- skills-assessment
- maturity-models
- comparative-metrics

## Capabilities

- Polar axes with numeric series
- Multiple overlays

## Syntax highlights

```mermaid
radar-beta
axis a["A"], b["B"]
curve c{1,2,3}
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
