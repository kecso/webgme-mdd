# S2 — Aircraft RFLP: fuel control-maintenance + radar multi-views

## Pitch

An airframer integrates an avionics **Control Maintenance System (CMS)** with a physical **fuel system**, while a parallel program develops a **radar** using Requirements–Functional–Logical–Physical (RFLP) multi-view methods in a PLM-backed environment. The hard problem is early detection of interface and behavioral mismatches across disciplinary views before detailed design/manufacture.

## Literature & industrial anchors

| Source | What we borrow |
|--------|----------------|
| SysEng 2016 — CMS applied to aircraft fuel system | Two MBSE styles (Harmony-style CMS vs customized fuel-system MBSE) integrated in SysML; avionics ↔ physical coupling |
| Springer / 3DEXPERIENCE aircraft radar use case | RFLP multi-views methodology; native traceability requirements → operational → functional → component; concurrent IPPD; digital twin intent |
| Correlating logical & physical models (SYSCON 2024 experience) | Industrial lesson: logical architecture alone under-specifies what physical simulation needs — interface augmentation required |
| Northrop Grumman phased-array MBSE case | Architecture models connected to multidisciplinary analysis for requirements checking & trade studies |

## Domains combined

| Concern | Diagram(s) | Example content |
|---------|------------|-----------------|
| Stakeholder / airworthiness reqs | `requirement` | Detect fuel imbalance; BIT coverage; radar detection range |
| Operational scenarios | `journey`, `timeline`, `usecase` | Preflight BIT → climb → cruise fuel transfer → landing |
| Functional flows | `flowchart` | Fuel transfer interlocks; CMS fault isolation tree |
| Logical/physical structure | `architecture`, `block`, `c4` | CMS computer, fuel pumps/valves, tanks, radar LRU, cooling |
| Modes | `state` | FuelSystem: Normal / Transfer / Isolate; Radar: STBY / Radiate / FailSafe |
| Interactions | `sequence` | CMS commands valve; sensor reports quantity; maintenance download |
| Program & risks | `gantt`, `ishikawa` | ICD freeze milestones; “incorrect quantity reading” fishbone |
| Data / ICD | `er`, `class`, `packet` | FuelQuantity message; status bits |

## Integrated validation story

1. **R→F→L→P trace continuity**  
   Requirement → functional flowchart node → logical block → physical architecture node. Missing link = inconsistency.

2. **Avionics ↔ physical coupling**  
   CMS sequence commands must target architecture ports that fuel-system blocks actually expose (valve, pump, sensor).

3. **BIT / maintenance path**  
   Journey “maintenance download” must match a sequence and a state that allows maintenance mode; requirement `verifymethod` must point at that path.

4. **Discipline feedback loop**  
   Ishikawa causes (sensor drift, wiring, software scaling) must map to requirements and to flowchart checks / states that mitigate them.

5. **Schedule vs maturity**  
   Gantt “ICD freeze” cannot complete while architecture↔sequence interface mismatches remain open.

## Why this story matters for WebGME

Aircraft literature explicitly sells **multi-view concurrent engineering** and early virtual validation with the customer. That is the same product thesis as webgme-mdd: one integrable model space, many disciplinary languages, continuous consistency.

## Seed focus for first slice

Start with fuel CMS only: `requirement` + `flowchart` + `architecture` + `state` + `sequence`, then add radar as a second subsystem sharing the Integrating Language.
