# User Journey (`journey`)

WebGME project housing a DSML metamodel for Mermaid **User Journey**.

## Mermaid keywords

- `journey`

## Status

`stable`

## Domains

- ux-design
- product-design
- customer-experience
- service-design

## Capabilities

- Titled journeys with sections
- Tasks scored 1-5 with actors
- Multi-actor task assignment

## Syntax highlights

```mermaid
journey
title My day
section Morning
Make tea: 5: Me
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
