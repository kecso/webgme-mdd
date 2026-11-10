# Multi-domain validation stories

These stories motivate **housing many Mermaid domains in one WebGME workspace**: not to draw prettier diagrams, but to **validate integrated system models** whose concerns span requirements, architecture, behavior, data, protocols, UX, and delivery.

Each story is synthesized from published literature and industrial case descriptions, then restated as a **WebGME-mdd scenario**: which diagram packages must be imported as libraries, which catalog domains they cover, what must stay consistent across them, and which validation checks a multi-language WebGME project should eventually run.

## Why multi-domain integration matters here

Isolated Mermaid files cannot enforce:

- a sequence participant that must exist as a C4 container / architecture service  
- a state machine that must refine a requirement and match journey steps  
- an ER entity that must back an event-model aggregate and API messages  
- a packet field layout that must match sequence payloads and architecture links  

WebGME’s strength is **shared identity + typed relationships across metamodels**. These stories define the first product requirements for that shared identity layer — and they explicitly list **which `diagrams/<id>` packages must be integrated**.

Studio note: the planned **view-only Mermaid + transparent overlay** approach is aimed at being a strong fit for these story packages (not necessarily every Mermaid family). See [`docs/findings/mermaid-embed-and-overlay.md`](../findings/mermaid-embed-and-overlay.md) § story-required fit.

## Story index

| ID | Title | Priority | Source flavor |
|----|-------|----------|---------------|
| [S1](./S1-automotive-aeb-cacc.md) | Automotive AEB / CACC++ safety stack | 1 | OMG HSUV, Valeo SysCARS, AVATAR/ERTS, CACC++ SRS, brake digital thread |
| [S2](./S2-aircraft-rflp-fuel-radar.md) | Aircraft RFLP — fuel CMS + radar multi-views | 3 | Aircraft fuel CMS SysML; radar RFLP / 3DEXPERIENCE multi-views |
| [S3](./S3-iec61850-substation.md) | IEC 61850 substation protection & SCADA | 2 | NamPower IEC 61850; Red Deer SAS; Hydro-Québec multi-modelling |
| [S4](./S4-event-driven-ticketing.md) | Event-driven ticketing / commerce platform | 2 | Event-sourcing workshops; modular monolith + Event Storming + C4 |
| [S5](./S5-medical-infusion-device.md) | Regulated infusion / IV therapy device | 1 | IV-set MBSE; infusion-pump reference models; ISO 14971 / FDA design controls |

Machine-readable index (required/optional packages, catalog domains, integration pairs): [`stories.json`](./stories.json).

## Required WebGME diagram packages per story

Package ids match directories under `diagrams/<id>/` and entries in `router/src/common/DomainRegistry.json`. **Required** packages are the minimum library set for that story’s core validators; **optional** enrich the seed.

| Story | Required `diagrams/<id>` | Optional |
|-------|--------------------------|----------|
| **S1** | `ears`, `requirement`, `usecase`, `c4`, `architecture`, `class`, `state`, `sequence`, `flowchart`, `er` | `block`, `gantt`, `kanban` |
| **S2** | `requirement`, `flowchart`, `architecture`, `block`, `state`, `sequence`, `ishikawa` | `ears`, `journey`, `timeline`, `usecase`, `c4`, `gantt`, `er`, `class`, `packet` |
| **S3** | `requirement`, `architecture`, `class`, `packet`, `sequence`, `state`, `flowchart` | `ears`, `c4`, `block`, `er`, `gantt`, `timeline`, `kanban` |
| **S4** | `eventmodeling`, `c4`, `er`, `sequence`, `state`, `journey` | `architecture`, `class`, `timeline`, `kanban`, `gantt`, `sankey`, `xychart` |
| **S5** | `requirement`, `usecase`, `journey`, `sequence`, `state`, `flowchart`, `ishikawa`, `architecture` | `ears`, `class`, `block`, `gantt`, `timeline`, `er` |

### Catalog domains covered (from `diagram-catalog.json`)

These are the **modeling domains** those packages target (not package ids). Full lists live in `stories.json` → `catalogDomains`.

| Story | Example catalog domains that must be co-present |
|-------|--------------------------------------------------|
| **S1** | `safety-critical`, `requirements-specification` (EARS), `requirements-management`, `software-architecture`, `finite-state-machines`, `software-interaction`, `data-modeling`, `process-modeling` |
| **S2** | `mbse`, `systems-engineering`, `process-modeling`, `system-structure`, `root-cause-analysis`, `software-interaction` |
| **S3** | `infrastructure`, `networking`, `binary-layouts`, `protocols`, `object-oriented-design`, `protocol-state`, `workflows` |
| **S4** | `event-driven-architecture`, `cqrs`, `domain-driven-design`, `system-context`, `data-modeling`, `ux-design` |
| **S5** | `safety-critical`, `mbse`, `ux-design`, `root-cause-analysis`, `finite-state-machines`, `software-architecture` |

## Cross-meta integration pairs (what “integrated” means)

Each story also defines **integration pairs** in `stories.json` (`from` diagram ↔ `to` diagram + `check`). Summary of the highest-value edges:

| Story | Must-integrate pairs |
|-------|----------------------|
| **S1** | requirement↔usecase/sequence · sequence↔c4/architecture · state↔sequence · flowchart↔architecture/class · sequence↔er |
| **S2** | requirement↔flowchart↔block↔architecture (RFLP) · sequence↔architecture · ishikawa↔requirement |
| **S3** | class↔architecture/packet · sequence↔architecture (GOOSE/MMS) · packet↔sequence · flowchart↔state |
| **S4** | eventmodeling↔c4/sequence · er↔state · journey↔eventmodeling · sequence↔c4 |
| **S5** | ishikawa↔requirement↔architecture · usecase↔sequence · journey↔state · requirement↔sequence (alarms) |

`ImportMDD` should eventually ensure all **required** packages are libraries before import; a future **CrossDomainValidate** plugin should walk `integrationPairs`.

**Architecture choice:** do **not** invent a WebGME package per diagram pair. Use a thin **Integrating Language** (identity anchors + typed correspondences + n-ary constraint instances) and keep pair semantics as a **rule catalog** (this file / `stories.json`). See [`docs/findings/integration-architecture.md`](../findings/integration-architecture.md).

## Cross-story validation themes (product backlog seeds)

1. **Name/identity binding** — same logical element referenced from ≥2 diagram types.  
2. **Satisfy / refine / verify traces** — requirement ↔ element ↔ test/scenario.  
3. **Interface contract** — architecture edge ↔ sequence messages ↔ packet/ER fields.  
4. **Mode consistency** — state machine ↔ sequence fragments ↔ journey tasks.  
5. **Allocation** — function/process steps allocated to architecture components.  
6. **Hazard coverage** — ishikawa / risk items covered by requirements and states.  
7. **Delivery coherence** — gantt/kanban/timeline items trace to capabilities still present in architecture.

## Suggested implementation order in WebGME

1. Shared **Integrating Language** (cross-meta pointers / sets) over Wave-A diagrams.  
2. Story **S1** and **S5** first (strongest req↔behavior↔structure literature).  
3. **S3** for protocol/packet integration.  
4. **S4** for event-modeling + C4 + ER.  
5. **S2** for RFLP-style multi-view industrial PLM patterns.
