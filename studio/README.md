# Markdown System Studio (MDSS)

Story-centered studio for multi-view system models as **Markdown / Mermaid / EARS**, with WebGME as the consistency backbone and a **browsable Markdown book** as the shareable deliverable.

Package id remains `@webgme-mdd/studio` inside the webgme-mdd monorepo.

## Run

```bash
npm install
npm run studio
# → http://127.0.0.1:3947
```

## Product shape

| Piece | Role |
|-------|------|
| Welcome / Projects | DSS-style shell; projects can bind a **story** (e.g. S1) |
| Domains | Enable Mermaid/EARS packages for the project |
| Canvas widget | View-only Mermaid + selection overlay → DiagramControl |
| Monaco source | Hideable; **Apply** is manual (ImportDelta TODO) |
| **Export book** | `README` + `SUMMARY` + `chapters/*.md` + `traces.md`; in-app preview at `/p/:owner/:name/book` |

See [`docs/findings/product-positioning.md`](../docs/findings/product-positioning.md).

## Intentional TODOs

- Zip download of real folder layout (currently a concatenated `.mdbundle.txt`)
- Seed empty chapters from story templates when domains are enabled
- WebGME export plugin → blob/repo; mdBook/Pages publish
- Richer MD renderer; Integrating traces filled from Core
- `WebGmeBridge` / ImportDelta (unchanged from view-first studio plan)
