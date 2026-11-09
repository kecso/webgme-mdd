# Event Modeling (`eventmodeling`)

WebGME project housing a DSML metamodel for Mermaid **Event Modeling**.

## Mermaid keywords

- `eventmodeling`
- `eventmodeling-beta`

## Status

`beta`

## Domains

- event-driven-architecture
- cqrs
- domain-driven-design
- event-sourcing

## Capabilities

- Events, commands, views/swimlanes
- Timeline of system behavior

## Syntax highlights

```mermaid
eventmodeling-beta
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
