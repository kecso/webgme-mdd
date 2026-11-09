# Gantt Chart (`gantt`)

WebGME project housing a DSML metamodel for Mermaid **Gantt Chart**.

## Mermaid keywords

- `gantt`

## Status

`stable`

## Domains

- project-management
- scheduling
- program-planning

## Capabilities

- Sections and tasks with dates/durations
- Dependencies (after)
- Milestones, done/active/crit statuses
- Excludes / weekends, date formats

## Syntax highlights

```mermaid
gantt
dateFormat YYYY-MM-DD
section Build
Design :a1, 2026-01-01, 7d
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
