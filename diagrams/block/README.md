# Block Diagram (`block`)

WebGME project housing a DSML metamodel for Mermaid **Block Diagram**.

## Mermaid keywords

- `block`
- `block-beta`

## Status

`beta`

## Domains

- system-structure
- hardware-blocks
- modular-architecture

## Capabilities

- Nested blocks/columns/spaces
- Edges between blocks
- Width/composite layouts

## Syntax highlights

```mermaid
block-beta
columns 3
A B C
A --> B
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
