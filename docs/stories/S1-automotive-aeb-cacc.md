# S1 — Automotive AEB / CACC++ safety stack

## Pitch

An OEM + Tier-1 team co-develops **automatic emergency braking (AEB)** and **cooperative adaptive cruise control (CACC)** features. Safety, cybersecurity, and performance requirements must stay consistent with logical architecture, ECU interactions, mode machines, and sensor/vehicle data — across supplier boundaries.

## Literature & industrial anchors

| Source | What we borrow |
|--------|----------------|
| OMG SysML Annex D — Hybrid SUV (HSUV) sample | Canonical multi-diagram automotive problem: context/use cases, sequence + state, requirements, structure, allocation |
| Valeo SysCARS (ERTS 2014) | Industrial SysML workflow for embedded automotive: requirements → functional/physical architecture |
| AVATAR / Télécom ParisTech ERTS 2012 | Automotive embedded prototyping with SysML requirements (safety & security), blocks, state machines |
| MSU CACC++ SRS | Student/industrial-style SRS combining use cases, domain/class model, sequences, states for platooning ACC |
| Automotive brake digital-thread paper (Modelica + SysML + requirements) | Closed-loop validation: requirements ↔ architecture ↔ performance models with bidirectional trace |

## WebGME packages to integrate

These are the `diagrams/<id>` projects (and router library names) this story must load together.

| Role | Package ids (`diagrams/…`) |
|------|----------------------------|
| **Required** | `ears`, `requirement`, `usecase`, `c4`, `architecture`, `class`, `state`, `sequence`, `flowchart`, `er` |
| **Optional** | `block`, `gantt`, `kanban` |

**Catalog domains covered (required set):** `safety-critical`, `requirements-management`, `requirements-specification`, `systems-engineering`, `uml`, `software-architecture`, `system-context`, `object-oriented-design`, `finite-state-machines`, `embedded-systems`, `software-interaction`, `protocols`, `process-modeling`, `workflows`, `database-design`, `data-modeling`.

**Must-integrate pairs:** ears↔requirement · requirement↔usecase/sequence · sequence↔c4/architecture · state↔sequence · flowchart↔architecture/class · sequence↔er  
(Full `integrationPairs` in [`stories.json`](./stories.json).)

**Lean exemplar:** [`lean/examples/S1_participant_binds/`](../../lean/examples/S1_participant_binds/) encodes `ParticipantBindsArchitecture` (sequence participant `sameAs` architecture service) with theorems for a good and a bad model — webgme-lean fashion.

## Domains combined (concern → diagram)

| Concern | Diagram(s) | Example content |
|---------|------------|-----------------|
| Stakeholder needs & safety/security reqs | `ears`, `requirement`, `usecase` | EARS shall-statements (When/While/If); `requirementDiagram` for satisfy/verify; ASIL / spoofing |
| Driver / system context | `c4`, `architecture` | Vehicle, radar/camera ECUs, brake controller, V2X, cloud diagnostics |
| Logical software structure | `class`, `block` | Sensor fusion, threat assessor, longitudinal controller |
| Modes & fault behavior | `state` | ACC active / AEB arming / emergency / limp-home |
| Timed interactions | `sequence` | ObstacleDetect → PlausibilityCheck → BrakeRequest → ActuatorAck |
| Process / decision logic | `flowchart` | Plausibility gate, driver override policy |
| Vehicle / trip data | `er` | ObstacleTrack, EgoState, BrakeEvent, DTC |
| Program planning | `gantt`, `kanban` | Homologation milestones vs feature backlog |

## Integrated validation story (what WebGME should catch)

1. **Req ↔ scenario coverage**  
   Every `high` risk requirement is satisfied by ≥1 use case and verified by ≥1 sequence (or test element).  
   *Failure:* AEB timing req exists, but no sequence includes BrakeRequest latency path.

2. **Architecture ↔ interaction**  
   Every sequence participant maps to a C4/architecture container or component.  
   *Failure:* Sequence talks to `V2XGateway` that is absent from architecture.

3. **State ↔ sequence**  
   Messages that change mode appear as transitions; forbidden messages in a state are flagged.  
   *Failure:* BrakeRequest sent while state = `DiagnosticsOnly`.

4. **Allocation**  
   Flowchart decision nodes allocated to a class/component that exists in architecture.  
   *Failure:* PlausibilityCheck allocated to `CameraECU` but architecture only has `RadarECU`.

5. **Data contract**  
   Sequence payloads / ER entities agree on fields (`obstacleId`, `ttc`, `decelerationCmd`).  
   *Failure:* ER has `ttc` but sequence/event payload uses `timeToCollision` with no binding.

6. **Supplier digital thread**  
   Requirement changes invalidate linked architecture ports and mark kanban tickets / gantt tasks dirty.

## Seed model sketch (minimal multi-file set)

```
.ears               →  REQ-AEB-001 [event], REQ-AEB-003 [unwanted], …
requirementDiagram  →  AEB_DetectAndBrake, CACC_MaintainGap, Sec_AntiSpoof  (trace links)
usecase-beta        →  DriverEngageCACC, EmergencyBrake
C4Container         →  SensorECU, FusionApp, BrakeCtrl, HMI
stateDiagram-v2     →  Off → ACC → AEB_Active → Complete
sequenceDiagram     →  happy path + sensor fault path
erDiagram           →  ObstacleTrack ||--o{ BrakeEvent
```

## Success criterion for webgme-mdd

A single WebGME project seed for S1 where running a **CrossDomainValidate** plugin reports the six check classes above against Mermaid-imported (or natively edited) multi-meta models.
