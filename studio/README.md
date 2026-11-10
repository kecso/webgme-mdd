# webgme-mdd Studio

DSS-style React shell for Mermaid MDD: **view-only** diagram canvas (widget) + **DiagramControl** + hideable **Monaco** source panel with **manual Apply**.

## Run

```bash
npm install
npm run studio
# → http://127.0.0.1:3947
```

## What works now

| Piece | Behavior |
|-------|----------|
| Welcome / Projects | Demo project list + create (localStorage) |
| Domains settings | Enable/disable catalog packages for the project |
| Diagram browser | Create/open instances per enabled domain; loads `diagrams/*/examples` samples |
| DiagramCanvas widget | `mermaid.render` view-only; selection overlay via SvgIndex |
| EARS | List view (not Mermaid) |
| Monaco source | Hideable; edit freely; **Apply to model** only updates on click |
| Apply | Updates demo store + re-renders; logs delta hint |

## Intentional TODOs

- Wire `WebGmeBridge` / `window.gmeClient` (DSS `onGMEInit`)
- `DomainManager` REST for library sync (`MDD:domain:…` kind)
- **ImportDelta**: AST diff → Core ops (no wipe-and-reinsert)
- Overlay pan/zoom shared transform; Integrating badges
- Monaco Mermaid language + `mermaid.parse` markers
- Map selection → Core `activeNode` / attribute inspector edits

Architecture notes: [`docs/findings/editor-architecture.md`](../docs/findings/editor-architecture.md), [`mermaid-embed-and-overlay.md`](../docs/findings/mermaid-embed-and-overlay.md).
