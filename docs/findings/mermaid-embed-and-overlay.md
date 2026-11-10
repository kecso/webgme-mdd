# How Mermaid is embedded today — and our overlay plan

## Short answer

**Current practice is view-only SVG.** Nobody treats Mermaid as a low-level layout editor. The live editor edits **text**; the diagram pane is a **render**. That matches us: WebGME/model (≈ text) is the source of truth; Mermaid is a projection; selection/highlights are an **overlay** keyed by element ids in the SVG.

---

## What implementations actually do

| Implementation | Embed pattern |
|----------------|---------------|
| **mermaid-live-editor** | Split UI: Monaco/CodeMirror edits source; `View` calls `mermaid.render` and shows SVG; pan/zoom via svg-pan-zoom. Separate `/view` route is diagram-only. **No SVG node dragging as model edit.** |
| **Docs sites (Docusaurus theme-mermaid, MkDocs, etc.)** | `mermaid.render` → inject SVG string (`innerHTML` / `dangerouslySetInnerHTML`). Often add zoom-lightbox by **cloning** the SVG into a modal. |
| **Security-minded previews** | Same render path; sometimes strip `foreignObject` / scripts; often **skip `bindFunctions`** for a static figure. |
| **This repo’s `catalog/`** | Same: `const { svg } = await mermaid.render(…); host.innerHTML = svg`. |

Common stack:

```text
source string  →  mermaid.render(id, source)  →  { svg, bindFunctions?, diagramType }
                                                      ↓
                                            mount svg string in a host div
                                            (optional pan/zoom wrapper)
                                            (optional bindFunctions for click callbacks)
```

There is **no** mainstream “manipulate dagre layout handles inside Mermaid” product path. Layout is owned by Mermaid’s engines.

---

## Prefer view-only for webgme-mdd

Agreed rationale:

1. Mermaid does **not** expose meaningful low-level layout manipulation APIs for most diagram types.  
2. Our ops catalog already describes **model/text-shaped** edits (add node, set label, add edge…), not “nudge Bézier 3px.”  
3. Equating UI actions to **Export text ↔ Core attributes** keeps round-trip honest.

So the canvas is a **read-only projection**. Editing happens in inspector / palette / structured forms (and optionally a source pane), then re-export → re-render.

---

## Can we identify elements? (probed, mermaid@11.17)

Yes, for the important families — with **diagram-specific** conventions. After `render`, SVG nodes carry ids / `data-*` derived from source ids (prefixed by the render id Mermaid assigns).

| Diagram | Node identity in SVG | Edge / message identity |
|---------|----------------------|-------------------------|
| **flowchart** | `id="…-flowchart-A-0"` (source id `A`) | `data-id="L_A_B_0"`, `data-et="edge"` |
| **sequence** | `data-et="participant"`, `data-id="Alice"` | `data-et="message"`, `data-id="i0"`, `data-from` / `data-to` |
| **class** | `…-classId-Animal-0` | `data-id="id_Animal_Dog_1"` |
| **state** | `…-state-Still-1` | `data-id="edge0"` (ordinal — weaker than named) |
| **er** | `…-entity-CUSTOMER-0` | relation id embeds entity names |
| **c4** | `…-user`, `…-sys` (from C4 ids) | weaker `data-*` in probe |
| **mindmap** | `…-node_0` (ordinal) | `edge_0_1` — map via tree order, not source names |

Also: nodes often have `class` tokens like `node`, `edgePaths`, `flowchart-link`. Edges frequently expose `data-edge="true"`.

**Implication:** build a small **SvgIndex** per diagram type: parse mounted SVG → map `sourceElementId → DOMRect` (via `getBBox()` / `getBoundingClientRect()`). Prefer `data-id` / stable id suffixes over ordinal-only schemes where available.

`htmlLabels: false` still left some `foreignObject` in flowchart probes; do not rely on killing FO for hit-testing — hit the **node group** (`g.node`), not the inner HTML label.

---

## Transparent overlay pattern (recommended)

```text
┌─────────────────────────────────────┐
│  position:relative host             │
│  ┌───────────────────────────────┐  │
│  │ Mermaid SVG (pointer-events:  │  │
│  │ none OR auto for pan only)    │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ absolute overlay (same box)   │  │
│  │  - highlight rects/paths      │  │
│  │  - click targets = model ids  │  │
│  │  - no layout mutation of SVG  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

Workflow:

1. Export Mermaid text from WebGME → `mermaid.render` → mount SVG.  
2. Walk SVG; for each recognizable element, record `{ modelId, svgId, bbox }`.  
3. Overlay draws selection chrome from bboxes (CSS transform aligned to SVG `viewBox` / pan-zoom matrix).  
4. Click overlay target → select WebGME node / open inspector.  
5. User edits attributes (or structured “text ops”) → Core commit → re-export → re-render → rebuild index.

Pan/zoom: apply the **same** transform to overlay (or put overlay inside the transformed viewport). Live editor’s svg-pan-zoom approach is the template.

**Do not** use Mermaid `click` directives / `bindFunctions` as the primary selection mechanism for the studio — they couple behavior into the diagram source. Overlay + SvgIndex keeps the projection dumb.

---

## Equating “manipulation” to text/model ops

| User gesture | What it means | Not what it means |
|--------------|---------------|-------------------|
| Select shape | Select model element with that id | Move layout handle |
| “Add node” in palette | Append Core node + regenerate Mermaid | Draw free rectangle on SVG |
| Edit label in inspector | `setAttribute` → new text in export | Edit DOM text inside foreignObject |
| Connect A→B | Create edge/pointer in Core | Rubber-band that only lives in SVG |
| Delete | Delete Core node | Remove SVG `<g>` only |

Wardley/quadrant (position-as-data) are the rare cases where coordinates are attributes — still edited as **model numbers**, then re-render, not as live SVG drag unless we later add a deliberate special case.

---

## Recommendation for the studio

1. **View-only Mermaid embed** (same as live-editor View + our catalog).  
2. **Overlay selection layer** using probed id/`data-id` maps.  
3. **All mutations** = WebGME Core ops that change what Export would emit (the “text equivalence”).  
4. Optional later: side-by-side Mermaid source pane (Monaco) for power users — still not SVG editing.

Probe artifacts: `docs/findings/samples/mermaid-embed-ids.json`, `mermaid-story-overlay-fitness.json`.

---

## Fit for story-required diagrams (good enough ≠ perfect)

Union of **required** packages across S1–S5:

`architecture`, `block`, `c4`, `class`, `ears`, `er`, `eventmodeling`, `flowchart`, `ishikawa`, `journey`, `packet`, `requirement`, `sequence`, `state`, `usecase`

Overlay / identity fitness against mermaid@11.17 catalog samples:

| Package | Stories | Overlay fit | Identity hooks |
|---------|---------|-------------|----------------|
| flowchart | S1–S3, S5 | **Strong** | `…-flowchart-<id>-N`, edges `data-id=L_A_B_0` |
| sequence | all | **Strong** | `data-et=participant\|message`, `data-id`, `data-from`/`data-to` |
| class | S1, S3 | **Strong** | `…-classId-<Name>-N`, relation `data-id` |
| state | all | **Strong** | `…-state-<Name>-N`; edges ordinal `edgeN` (name via endpoints) |
| er | S1, S4 | **Strong** | `…-entity-<NAME>-N`, relation ids embed entity names |
| requirement | S1–S3, S5 | **Strong** | `…-<reqName>`, `…-<elementName>`, edge `data-id` |
| block | S2 | **Strong** | `…-<BlockId>`, edge ids include endpoints |
| architecture | S1–S3, S5 | **Good** | `…-service-<id>`, `…-group-<id>`, `…-L_a_b_0` |
| c4 | S1, S4 | **Good** | `…-<c4Id>` on shapes; thinner `data-*` |
| journey | S4, S5 | **Good** | `…-task0`… ordered tasks — map by section/task index |
| ishikawa | S2, S5 | **Fair** | Mostly root SVG; use text/`getBBox` on labeled groups or ordered causes |
| packet | S3 | **Fair** | Field order = bit ranges; overlay strips by row index, not named ids |
| ears | S1 | **N/A (better)** | Not Mermaid — list/card UI is the “view”; row = `reqId` (perfect identity) |
| usecase | S1, S5 | **Deferred** | `usecase-beta` **not in** mermaid@11.17 bundle — view when runtime catches up; until then inspector-first / placeholder |
| eventmodeling | S4 | **Deferred** | Same — experimental syntax failed parse on 11.17; treat as structured timeline UI or upgrade Mermaid later |

### Verdict for stories

- **S1 / S3 core path** (flowchart, sequence, class, state, er, requirement, architecture/c4, block): overlay approach is a **strong fit**.  
- **S2 / S5** add ishikawa (fair — still selectable via geometry/order heuristics) and usecase (wait on Mermaid or non-SVG panel).  
- **S4** is fine on sequence/state/er/c4/journey; eventmodeling needs a fallback panel until the diagram type stabilizes in Mermaid.  
- **ears** does not need SVG overlay at all.

So: **not perfect for every package**, but **pretty close for the story-critical set**, with only experimental Mermaid betas and a couple of “fair” types needing small adapters — not a different architecture.
