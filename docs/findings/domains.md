# Domains targeted by Mermaid diagrams

These are the **known modeling domains** implied by Mermaid’s diagram families. Use this list when deciding which WebGME metamodels (DSMLs) to stand up first.

Machine-readable inverse index: `domainIndex` in [`scripts/diagram-catalog.json`](../../scripts/diagram-catalog.json).

## Software engineering

| Domain | Diagrams |
|--------|----------|
| Object-oriented / UML design | class, sequence, state, usecase |
| Software & enterprise architecture | c4, architecture, block, class |
| API / protocol interaction | sequence, packet, state |
| Version control education | gitgraph |
| CI/CD & workflows | flowchart |
| Event-driven / CQRS / DDD | eventmodeling |
| Language / grammar engineering | railroad |

## Data & information

| Domain | Diagrams |
|--------|----------|
| Database / ER modeling | er |
| Analytics & reporting | pie, xychart, radar, sankey, treemap |
| Information architecture / taxonomies | er, treemap, treeview, mindmap |
| Network packet layouts | packet |

## Systems & requirements

| Domain | Diagrams |
|--------|----------|
| Systems engineering / MBSE | requirement, c4 |
| Requirements & product scope | requirement, usecase |
| Finite-state / embedded / UI state | state |
| Safety-critical verification links | requirement |

## Product, UX, and delivery

| Domain | Diagrams |
|--------|----------|
| UX / service / customer journeys | journey |
| Agile delivery & work tracking | kanban, gantt |
| Roadmaps & storytelling | timeline, gantt |
| Prioritization / portfolio | quadrant, treemap |

## Strategy & organization

| Domain | Diagrams |
|--------|----------|
| Strategy & technology evolution | wardley, quadrant |
| Complexity / decision frameworks | cynefin |
| Org / hierarchy views | treeview, mindmap |

## Quality & operations

| Domain | Diagrams |
|--------|----------|
| Root-cause / quality (fishbone) | ishikawa |
| Flow / conversion / energy balances | sankey |
| Cloud / infra topology | architecture |

## Suggested WebGME metamodel waves

1. **Wave A (high leverage):** flowchart, sequence, class, state, er, c4, requirement  
2. **Wave B (delivery & UX):** gantt, kanban, journey, timeline, gitgraph  
3. **Wave C (analytics):** pie, xychart, sankey, quadrant, radar, treemap  
4. **Wave D (specialized / beta):** architecture, block, packet, usecase, eventmodeling, ishikawa, mindmap  
5. **Wave E (experimental):** venn, treeview, wardley, cynefin, railroad  

Each wave already has a draft `Language.json` under `diagrams/<id>/metamodel/`.

## Multi-domain stories (integration motivators)

Literature- and industry-backed scenarios that **combine** these domains for cross-model validation live in [`docs/stories/`](../stories/README.md). Each story now lists **required/optional `diagrams/<id>` packages**, **catalog domains**, and **integration pairs** (see `docs/stories/stories.json`).

| Story | Required packages (abbrev.) | Stresses |
|-------|----------------------------|----------|
| S1 Automotive AEB/CACC | requirement, usecase, c4, architecture, class, state, sequence, flowchart, er | req ↔ architecture ↔ state ↔ sequence ↔ ER |
| S2 Aircraft RFLP fuel/radar | requirement, flowchart, architecture, block, state, sequence, ishikawa | R→F→L→P traces across avionics & physical |
| S3 IEC 61850 substation | requirement, architecture, class, packet, sequence, state, flowchart | architecture ↔ packet ↔ sequence ↔ LN class model |
| S4 Event-driven ticketing | eventmodeling, c4, er, sequence, state, journey | eventmodeling ↔ C4 ↔ ER ↔ journey |
| S5 Medical infusion device | requirement, usecase, journey, sequence, state, flowchart, ishikawa, architecture | hazard ↔ requirement ↔ state ↔ clinical journey |

Lean formalizations (webgme-lean fashion) sit beside priority META packages at `diagrams/<id>/lean/Domain.lean`. Cross-domain proof exemplar: `lean/examples/S1_participant_binds/`. See [lean-formalization.md](./lean-formalization.md).
