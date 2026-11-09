# Mindmap (`mindmap`)

WebGME project housing a DSML metamodel for Mermaid **Mindmap**.

## Mermaid keywords

- `mindmap`

## Status

`stable`

## Domains

- knowledge-management
- brainstorming
- education
- ideation

## Capabilities

- Hierarchical radial/outline mind maps
- Icons and class styling
- Markdown-ish indentation

## Syntax highlights

```mermaid
mindmap
root((idea))
  Branch
    Leaf
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
