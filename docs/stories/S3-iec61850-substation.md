# S3 — IEC 61850 substation protection, control & SCADA

## Pitch

A utility modernizes a distribution/transmission substation with IEC 61850 IEDs, GOOSE horizontal protection signaling, MMS vertical SCADA reporting, redundant station bus, and HMI. Engineering fails when **data models, packet/event semantics, protection sequences, and network architecture** drift apart.

## Literature & industrial anchors

| Source | What we borrow |
|--------|----------------|
| NamPower / SEL IEC 61850 modernization case | Data modeling (logical devices/nodes), GOOSE vs MMS roles, SCADA/HMI reporting, network design, testing & training |
| City of Red Deer SS14 SAS case (Alberta) | 17 IEDs, PRP redundant fiber LAN, GOOSE + MMS engineering steps, FAT/SAT verification narrative |
| Hydro-Québec multi-modelling (IEC 61850) | Stakeholder-specific UML domain views of Logical Nodes; explicit note that views can be inconsistent — future analysis needed |
| ADMID / DSO SCADA integration (Energies 2022) | Automated data-model integration of distributed energy systems into SCADA ICT environment |
| IEC 61850 + IEC 61499 service-oriented feeder case | Requirements as orchestrators mapped onto logical-node services |

## Domains combined

| Concern | Diagram(s) | Example content |
|---------|------------|-----------------|
| Protection & SCADA requirements | `requirement` | Clear feeder fault < cycle budget; SCADA telemetry completeness |
| Station / bay architecture | `architecture`, `c4`, `block` | IEDs, switches (PRP), HMI/gateway, transformers, feeders |
| Object / LN data model | `class`, `er` | LogicalDevice, LogicalNode (PTOC, XCBR…), DataObjects |
| Wire / message layout | `packet` | GOOSE APDU fields; quality bits; stVal |
| Protection & control chats | `sequence` | Fault → GOOSE trip → breaker XCBR → MMS report to HMI |
| Device / bay modes | `state` | Breaker: Open/Close/Fault; IED: InService / Test / Blocked |
| Automation logic | `flowchart` | Interlock: cannot close while earth switch closed |
| Commissioning plan | `gantt`, `timeline`, `kanban` | FAT, SAT, cutover windows |

## Integrated validation story

1. **Semantic LN binding**  
   Class/ER LogicalNode used in architecture must appear in sequences and packet definitions (no anonymous GGIO-only shortcuts without explicit waiver).

2. **Horizontal vs vertical traffic**  
   Sequence arrows labeled GOOSE must connect IED↔IED on station bus architecture; MMS must be IED↔HMI/gateway. Wrong pairing = error.

3. **Interlock consistency**  
   Flowchart interlocks must be reflected in state machines (forbidden Close while ESW Closed) and covered by a requirement.

4. **Redundancy assumptions**  
   Architecture shows PRP dual attaches; sequence fault-injection path must still deliver trip if one LAN path fails (validation scenario set).

5. **Multi-stakeholder view drift** (Hydro-Québec lesson)  
   WebGME explicitly compares “standardization view” vs “functional engineer view” of the same LN and reports attribute/operation mismatches.

6. **FAT/SAT evidence**  
   Timeline/gantt verification tasks must reference requirement verify methods and concrete sequence test cases.

## Seed focus

Bay with one feeder IED + breaker IED + HMI: `architecture` + `class` + `packet` + `sequence` + `state` + `requirement`.

## Distinctive WebGME value

Protocol (`packet`) + object model (`class`/`er`) + timed interactions (`sequence`) + topology (`architecture`) is a rare combination in text-diagram tools; WebGME can own the **cross-meta interface contract** for utility automation.
