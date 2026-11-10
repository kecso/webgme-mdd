# Mermaid diagram catalog (survey)

Survey date: **2026-11-09** (America/Chicago). Mermaid docs surface surveyed against the public syntax examples and community cheat sheets covering **11.x / 12.x**.

Source of truth in-repo: [`scripts/diagram-catalog.json`](../../scripts/diagram-catalog.json) and generated [`diagrams/index.json`](../../diagrams/index.json).

## Summary

| Status | Count | Notes |
|--------|------:|-------|
| stable | 16 | Widely documented, default-bundle friendly |
| beta | 9 | Keyword often `*-beta`; API still shifting |
| experimental | 5 | Present in docs/examples; may be absent from some builds |

**Total packaged here: 30** Mermaid WebGME project directories under `diagrams/`, plus **1 companion language** (`ears`).

## Companion languages (not Mermaid)

| ID | Name | Kind | Status | Primary domains |
|----|------|------|--------|-----------------|
| ears | EARS Requirements Specification | textual-spec | companion | requirements-specification, MBSE, safety-critical |

EARS is the **requirements body language**; Mermaid `requirementDiagram` remains the **traceability** view. See [requirements-specification.md](./requirements-specification.md).

## Full list

| ID | Name | Opening keywords | Status | Primary domains |
|----|------|------------------|--------|-----------------|
| flowchart | Flowchart | `flowchart`, `graph` | stable | process-modeling, workflows, algorithms |
| sequence | Sequence Diagram | `sequenceDiagram` | stable | software-interaction, protocols, UML |
| class | Class Diagram | `classDiagram` | stable | OO design, UML, domain-modeling |
| state | State Diagram | `stateDiagram`, `stateDiagram-v2` | stable | FSM, embedded, UI state |
| er | Entity Relationship | `erDiagram` | stable | database-design, data-modeling |
| journey | User Journey | `journey` | stable | UX, service design |
| gantt | Gantt Chart | `gantt` | stable | project-management, scheduling |
| pie | Pie Chart | `pie` | stable | analytics, reporting |
| quadrant | Quadrant Chart | `quadrantChart` | stable | strategy, prioritization |
| requirement | Requirement Diagram | `requirementDiagram` | stable | systems-engineering, MBSE |
| gitgraph | Git Graph | `gitGraph` | stable | VCS education, release engineering |
| c4 | C4 Architecture | `C4Context`…`C4Deployment` | stable | software / enterprise architecture |
| mindmap | Mindmap | `mindmap` | stable | knowledge management, ideation |
| timeline | Timeline | `timeline` | stable | roadmapping, history |
| kanban | Kanban | `kanban` | stable | agile, work tracking |
| ishikawa | Ishikawa (Fishbone) | `ishikawa`, `fishbone` | stable | root-cause, quality |
| sankey | Sankey | `sankey-beta` | beta | flow analysis, funnels |
| xychart | XY Chart | `xychart-beta` | beta | timeseries, analytics |
| block | Block Diagram | `block-beta` | beta | system structure |
| packet | Packet Diagram | `packet-beta` | beta | networking, binary layouts |
| architecture | Architecture | `architecture-beta` | beta | cloud / infra topology |
| radar | Radar Chart | `radar-beta` | beta | maturity / comparative metrics |
| treemap | Treemap | `treemap-beta` | beta | hierarchies, breakdowns |
| usecase | Use Case | `usecase-beta` | beta | requirements, UML |
| eventmodeling | Event Modeling | `eventmodeling-beta` | beta | event-driven / CQRS / DDD |
| venn | Venn Diagram | `venn` | experimental | set overlap |
| treeview | Tree View | `treeView` | experimental | hierarchies, taxonomies |
| wardley | Wardley Map | `wardley-beta` | experimental | strategy / evolution |
| cynefin | Cynefin Framework | `cynefin` | experimental | complexity decisions |
| railroad | Railroad Diagram | `railroad` | experimental | grammar / parser design |

## Not packaged as first-class (noted)

Some community lists mention `zenuml`, `swimlane-beta`, or other add-ons. They are either separate packages or not consistently in the default Mermaid browser bundle. Track them in future iterations if they stabilize.

## Per-diagram artifacts

Each `diagrams/<id>/` directory is a **webgme-cli-shaped** project with:

- `metamodel/Language.json` — webgme-json importer style META draft
- `metamodel/descriptor.json` — human/tooling summary
- `examples/sample.mmd` — canonical Mermaid sample
- `src/plugins/{ImportMermaid,ExportMermaid,ApplyLanguageMeta}` — Core API drafts
