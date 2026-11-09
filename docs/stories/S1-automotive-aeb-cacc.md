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

## Domains combined (Mermaid → WebGME packages)

| Concern | Diagram(s) | Example content |
|---------|------------|-----------------|
| Stakeholder needs & safety/security reqs | `requirement`, `usecase` | “Detect obstacle and brake within X ms”; ASIL constraints; spoofing resistance |
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
requirementDiagram  →  AEB_DetectAndBrake, CACC_MaintainGap, Sec_AntiSpoof
usecase-beta        →  DriverEngageCACC, EmergencyBrake
C4Container         →  SensorECU, FusionApp, BrakeCtrl, HMI
stateDiagram-v2     →  Off → ACC → AEB_Active → Complete
sequenceDiagram     →  happy path + sensor fault path
erDiagram           →  ObstacleTrack ||--o{ BrakeEvent
```

## Success criterion for webgme-mdd

A single WebGME project seed for S1 where running a **CrossDomainValidate** plugin reports the six check classes above against Mermaid-imported (or natively edited) multi-meta models.
