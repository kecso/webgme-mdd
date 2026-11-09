# Multi-domain validation stories

These stories motivate **housing many Mermaid domains in one WebGME workspace**: not to draw prettier diagrams, but to **validate integrated system models** whose concerns span requirements, architecture, behavior, data, protocols, UX, and delivery.

Each story is synthesized from published literature and industrial case descriptions, then restated as a **WebGME-mdd scenario**: which diagram types participate, what must stay consistent across them, and which validation checks a multi-language WebGME project should eventually run.

## Why multi-domain integration matters here

Isolated Mermaid files cannot enforce:

- a sequence participant that must exist as a C4 container / architecture service  
- a state machine that must refine a requirement and match journey steps  
- an ER entity that must back an event-model aggregate and API messages  
- a packet field layout that must match sequence payloads and architecture links  

WebGME’s strength is **shared identity + typed relationships across metamodels**. These stories define the first product requirements for that shared identity layer.

## Story index

| ID | Title | Primary domains | Source flavor |
|----|-------|-----------------|---------------|
| [S1](./S1-automotive-aeb-cacc.md) | Automotive AEB / CACC++ safety stack | requirements, use cases, architecture, class, state, sequence, ER, process | OMG HSUV, Valeo SysCARS, AVATAR/ERTS, CACC++ SRS, brake digital thread |
| [S2](./S2-aircraft-rflp-fuel-radar.md) | Aircraft RFLP — fuel CMS + radar multi-views | requirements, functional flow, state, sequence, architecture/block, timeline, RCA | Aircraft fuel CMS SysML; radar RFLP / 3DEXPERIENCE multi-views |
| [S3](./S3-iec61850-substation.md) | IEC 61850 substation protection & SCADA | architecture, packet, sequence, state, class/ER, requirements, flowchart | NamPower IEC 61850; Red Deer SAS; Hydro-Québec multi-modelling |
| [S4](./S4-event-driven-ticketing.md) | Event-driven ticketing / commerce platform | event modeling, C4, ER, sequence, state, journey, kanban | Event-sourcing workshops; modular monolith + Event Storming + C4 |
| [S5](./S5-medical-infusion-device.md) | Regulated infusion / IV therapy device | requirements, use cases, journey, sequence, state, flowchart, ishikawa, class | IV-set MBSE; infusion-pump reference models; ISO 14971 / FDA design controls |

Machine-readable index: [`stories.json`](./stories.json).

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
