# Timeline (`timeline`)

WebGME project housing a DSML metamodel for Mermaid **Timeline**.

## Mermaid keywords

- `timeline`

## Status

`stable`

## Domains

- roadmapping
- history
- product-planning
- storytelling

## Capabilities

- Sections with time periods and events
- Multi-event periods

## Syntax highlights

```mermaid
timeline
title History
section 2024
2024 : event
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
