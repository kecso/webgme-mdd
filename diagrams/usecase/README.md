# Use Case Diagram (`usecase`)

WebGME project housing a DSML metamodel for Mermaid **Use Case Diagram**.

## Mermaid keywords

- `usecase`
- `usecase-beta`

## Status

`beta`

## Domains

- requirements
- uml
- product-scope
- systems-analysis

## Capabilities

- Actors and use cases
- Include/extend/generalization links
- System boundaries

## Syntax highlights

```mermaid
usecase-beta
actor User
User --> (Login)
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
