# Git Graph (`gitgraph`)

WebGME project housing a DSML metamodel for Mermaid **Git Graph**.

## Mermaid keywords

- `gitGraph`

## Status

`stable`

## Domains

- version-control
- devex-education
- release-engineering

## Capabilities

- Commits, branches, checkout, merge, cherry-pick
- Commit tags/types/ids
- Orientation options

## Syntax highlights

```mermaid
gitGraph
commit
branch develop
checkout main
merge develop
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
