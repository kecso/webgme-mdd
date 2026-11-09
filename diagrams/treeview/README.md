# Tree View (`treeview`)

WebGME project housing a DSML metamodel for Mermaid **Tree View**.

## Mermaid keywords

- `treeView`

## Status

`experimental`

## Domains

- hierarchies
- file-systems
- org-charts
- taxonomies

## Capabilities

- Indented hierarchical trees

## Syntax highlights

```mermaid
treeView
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
