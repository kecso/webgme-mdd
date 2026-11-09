# Architecture Diagram (`architecture`)

WebGME project housing a DSML metamodel for Mermaid **Architecture Diagram**.

## Mermaid keywords

- `architecture`
- `architecture-beta`

## Status

`beta`

## Domains

- cloud-architecture
- infrastructure
- service-topology

## Capabilities

- Groups, services, edges
- Icons for cloud resources
- Directional service links

## Syntax highlights

```mermaid
architecture-beta
group api
service db
api:L --> R:db
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
