# S5 — Regulated infusion / IV therapy device

## Pitch

A medical-device manufacturer develops an infusion pump or disposable IV administration set under FDA design controls, ISO 14971 risk management, and IEC 62366 usability. Models must connect **intended use, hazards, requirements, clinician workflows, device states, and interaction sequences** so safety arguments remain evidence-backed.

## Literature & industrial anchors

| Source | What we borrow |
|--------|----------------|
| IV infusion set MBSE case (systems thinking in medical devices) | Context, use cases, sequence (gravity administration), categorized requirements & traceability |
| INCOSE Biomedical-Healthcare MBSE Challenge / generic infusion pump | Reference SysML tying SE process to ISO 14971 and IEC 62366; requirements + structure |
| Purdue / FDA-oriented SE presentations | Map risk-analysis steps to operational concept, functional/physical architecture, risk controls |
| OMG/MBSEHC — MBE + safety assurance cases | Models and verification results as assurance-case evidence with explicit traceability |
| A model-based reference architecture for medical device development | Capture regulatory environment and map specialized requirements onto system components |

## WebGME packages to integrate

| Role | Package ids (`diagrams/…`) |
|------|----------------------------|
| **Required** | `requirement`, `usecase`, `journey`, `sequence`, `state`, `flowchart`, `ishikawa`, `architecture` |
| **Optional** | `class`, `block`, `gantt`, `timeline`, `er` |

**Catalog domains covered (required set):** `safety-critical`, `mbse`, `systems-engineering`, `requirements-management`, `uml`, `ux-design`, `service-design`, `software-interaction`, `finite-state-machines`, `ui-state`, `embedded-systems`, `process-modeling`, `workflows`, `quality-management`, `root-cause-analysis`, `software-architecture`.

**Must-integrate pairs:** ishikawa↔requirement↔architecture · usecase↔sequence · journey↔state · requirement↔sequence (alarms)  
(Full `integrationPairs` in [`stories.json`](./stories.json).)

## Domains combined (concern → diagram)

| Concern | Diagram(s) | Example content |
|---------|------------|-----------------|
| Regulatory & safety reqs | `requirement` | Occlusion alarm; max flow error; biocompatibility constraints |
| Intended use | `usecase`, `journey` | Clinician primes set; starts infusion; responds to alarm |
| Clinical interactions | `sequence` | Clinician ↔ Pump ↔ Patient line ↔ EMR (optional) |
| Device modes | `state` | Idle → Priming → Infusing → Alarm → Stopped |
| Therapy / control logic | `flowchart` | Alarm escalation; free-flow prevention |
| Risk analysis | `ishikawa` | Over-infusion causes: wrong concentration, pump runaway, set leak |
| Product structure | `class`, `block`, `architecture` | Pump, disposable set, sensors, UI, power |
| Usability evidence plan | `gantt`, `timeline` | Formative / summative usability tests |
| Data / logs | `er` | InfusionSession, AlarmEvent, DrugLibraryEntry |

## Integrated validation story

1. **Hazard → requirement → design**  
   Each ishikawa cause maps to a risk control requirement; each control is satisfied by a state, flowchart check, or structural element.  
   *Failure:* “Free flow” cause with no requirement and no mechanical/software control element.

2. **Use case ↔ sequence ↔ journey**  
   Gravity vs pump-controlled administration use cases each have clinician sequences; journey scores for “alarm response” require an Alarm state path.

3. **Alarm integrity**  
   Requirement “occlusion alarm within T seconds” verified by sequence timing and present in state `Alarm` entry actions.

4. **Assurance-case ready traces**  
   Requirement `verifymethod` points to test elements; gantt verification tasks reference those same elements (evidence graph).

5. **Disposable ↔ durable boundary**  
   Architecture separates pump vs set; sequences that assume sensors on the disposable must match physical allocation.

6. **Change impact**  
   Editing drug-library ER fields marks related requirements and usability journeys as needing re-verification.

## Seed focus

Single-channel pump: occlusion alarm path across `requirement` + `ishikawa` + `state` + `sequence` + `journey`.

## Distinctive WebGME value

Regulated industries need **audit-grade multi-view consistency**, not just diagrams in a wiki. WebGME can host the living assurance graph that Mermaid snippets alone cannot validate.
