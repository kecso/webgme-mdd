# Diagram syntax and capabilities

This document summarizes what each Mermaid diagram family can express — the vocabulary you would lift into a WebGME metamodel. Full samples live under `diagrams/<id>/examples/sample.mmd`.

## Common Mermaid rules

- First token selects the diagram type (`flowchart TD`, `sequenceDiagram`, …).
- Line comments: `%% …`
- Optional YAML frontmatter for config in newer Mermaid versions.
- Unknown keywords fail parse; many styling parameters fail silently.

## Stable families

### Flowchart (`flowchart` / `graph`)

**Capabilities:** ranked digraphs; directions TD/TB/LR/RL/BT; rich node shapes; solid/dotted/thick edges; labels; subgraphs; CSS classes / click handlers.

**Meta mapping:** `Diagram` → `Node` / `Edge` / `Subgraph`; Edge pointers `src`/`dst`.

### Sequence (`sequenceDiagram`)

**Capabilities:** participants/actors; sync/async/dashed arrows; activation; notes; `loop`/`alt`/`opt`/`par`/`critical`/`break`; autonumber; create/destroy.

**Meta mapping:** `Participant`, `Message` (`from`/`to`), `Fragment`, `Note`.

### Class (`classDiagram`)

**Capabilities:** classes/interfaces; members/methods + visibility; inheritance, composition, aggregation, association, dependency, realization; cardinalities; namespaces.

**Meta mapping:** `Class`, `Member`, `Method`, `Relationship`, `Namespace`.

### State (`stateDiagram-v2`)

**Capabilities:** states/transitions; nested composites; choice/fork/join; history; concurrency.

**Meta mapping:** `State` (contains State/Transition), `Transition` (`src`/`dst`), `Note`.

### ER (`erDiagram`)

**Capabilities:** entities, typed attributes, PK/FK/UK, cardinality relationships.

**Meta mapping:** `Entity`, `Attribute`, `Relationship`.

### Journey / Gantt / Timeline / Kanban

**Capabilities:** sectioned temporal or board layouts; scored tasks (journey); date math and dependencies (gantt); columns/tickets (kanban).

**Meta mapping:** `Section` + `Task`/`Period`/`Event`/`Ticket` as appropriate.

### Pie / Quadrant

**Capabilities:** labeled quantitative slices; 2×2 strategic grids with points in unit square.

### Requirement

**Capabilities:** SysML-like requirement and element nodes; satisfies/verifies/traces/… links — strong fit for MBSE WebGME languages.

### Git Graph

**Capabilities:** commit/branch/checkout/merge/cherry-pick storytelling for VCS pedagogy.

### C4 (`C4Context` … `C4Deployment`)

**Capabilities:** person/system/container/component/boundary/relation vocabulary aligned with the C4 model.

### Mindmap / Ishikawa

**Capabilities:** hierarchical brainstorming (mindmap); fishbone cause categories (ishikawa).

## Beta families

| Diagram | Core vocabulary | Notes for META |
|---------|-----------------|----------------|
| Sankey | Node, weighted Link | CSV-like triples in source |
| XY chart | axes + bar/line Series | numeric arrays |
| Block | nested Block, Edge | layout columns |
| Packet | bit Field ranges | protocol layouts |
| Architecture | Group, Service, Edge | iconographic cloud topo |
| Radar | Axis, Curve | polar comparisons |
| Treemap | valued Node tree | area encoding |
| Use case | Actor, UseCase, Boundary, Link | UML use-case |
| Event modeling | Command, Event, View, Swimlane | still evolving |

## Experimental families

Venn, TreeView, Wardley, Cynefin, Railroad appear in documentation examples but may be missing from some Mermaid builds. Metamodels are still drafted here so WebGME languages can lead Mermaid support.

## Round-trip strategy used in plugins

1. **Import:** parse (specialized for flowchart/sequence; generic line AST otherwise) → create META instances via Core.
2. **Preserve:** store original text on `mermaidSource` attribute/registry for lossless export.
3. **Export:** prefer stored source; else serialize structural Core tree back to Mermaid text.
