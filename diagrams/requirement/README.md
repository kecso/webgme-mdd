# Requirement Diagram (`requirement`)

WebGME project housing a DSML metamodel for Mermaid **Requirement Diagram**.

## Mermaid keywords

- `requirementDiagram`

## Status

`stable`

## Domains

- systems-engineering
- requirements-management
- mbse
- safety-critical

## Capabilities

- Requirement / element nodes with SysML-like fields
- Relationships: contains, copies, derives, satisfies, verifies, refines, traces

## Syntax highlights

```mermaid
requirementDiagram
requirement req1 { id: 1 text: ... }
element e1 { type: simulation }
e1 - satisfies -> req1
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
