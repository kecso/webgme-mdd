# Legitimate diagram manipulation operations

Foundation for a later Mermaid/EARS editor. Operations are those that **preserve the diagram’s semantics and Mermaid (or EARS) round-trip**, not free-form SVG drawing.

**Shared ops (all domains):** create diagram · rename · delete · duplicate · set title/direction where applicable · select element · edit primary label/attrs · delete element · undo/redo (WebGME commits) · export source · re-import/replace source · zoom/pan view (view-only).

**Out of scope (v1):** arbitrary pixel layout for layout-engine diagrams; editing Mermaid theme CSS as model data; operations Mermaid cannot serialize.

Legend: **S** = structural, **A** = attribute, **R** = relation/edge, **V** = view-only.

---

## Stable diagram families

### flowchart
| Op | Kind | Notes |
|----|------|-------|
| Add/remove node; set shape & label | S/A | Shapes constrained to Mermaid set |
| Add/remove/relabel edge; change line/arrow style | R/A | |
| Nest node in / lift from subgraph | S | |
| Add/remove subgraph; set direction | S/A | |
| Attach style class | A | Optional |

### sequence
| Op | Kind | Notes |
|----|------|-------|
| Add/remove/reorder participant; set alias/actor vs participant | S/A | |
| Add/remove message; set arrow type, label, activate/deactivate | R/A | |
| Add/remove note (over one or two participants) | S | |
| Add/remove fragment (alt/opt/loop/par/critical/break); edit guard label | S/A | Nest messages inside |
| Toggle autonumber | A | Diagram-level |

### class
| Op | Kind | Notes |
|----|------|-------|
| Add/remove class; stereotype/generics | S/A | |
| Add/remove/reorder member or method; visibility | S/A | |
| Add/remove relationship (inheritance, composition, aggregation, association, dependency, realization); cardinality | R/A | |
| Add/remove namespace; move class into namespace | S | |

### state
| Op | Kind | Notes |
|----|------|-------|
| Add/remove state (incl. start/end/choice/fork/join where supported) | S | |
| Add/remove transition; event/guard/action labels | R/A | |
| Nest state (composite); set concurrent regions if exposed in META | S | |
| Add note on state | S | |

### er
| Op | Kind | Notes |
|----|------|-------|
| Add/remove entity | S | |
| Add/remove/reorder attribute; PK/FK/type flags | S/A | |
| Add/remove relationship; cardinality ends | R/A | |

### journey
| Op | Kind | Notes |
|----|------|-------|
| Add/remove section | S | |
| Add/remove task; set score (1–5) and actors list | S/A | |

### gantt
| Op | Kind | Notes |
|----|------|-------|
| Set dateFormat / axisFormat / excludes (diagram attrs) | A | |
| Add/remove section | S | |
| Add/remove task; start, duration/end, status (done/active/crit), dependencies | S/A | |

### pie
| Op | Kind | Notes |
|----|------|-------|
| Add/remove slice; set label & numeric value | S/A | Values ≥ 0 |
| Set title; showData toggle | A | |

### quadrant
| Op | Kind | Notes |
|----|------|-------|
| Set axis labels / quadrant titles | A | |
| Add/remove point; set x,y in \[0,1\] and label | S/A | |

### requirement
| Op | Kind | Notes |
|----|------|-------|
| Add/remove requirement; id, text, risk, verifymethod, type | S/A | Body text ideally mirrored from **ears** |
| Add/remove element (design/test stand-in) | S/A | |
| Add/remove relation (contains, copies, derives, satisfies, verifies, refines, traces) | R | **Primary** editing surface for traceability |

### gitgraph
| Op | Kind | Notes |
|----|------|-------|
| Add branch; checkout | S | Ordered history |
| Add commit (message/tag/type/id) | S/A | |
| Merge / cherry-pick | R | Must reference existing branches/commits |
| Set orientation | A | |

### c4
| Op | Kind | Notes |
|----|------|-------|
| Switch diagram level (Context/Container/Component/…) | A | Or separate diagram instances |
| Add/remove Person, System, Container, Component, Boundary | S | |
| Set tech, description, external flag | A | |
| Add/remove Rel with label | R/A | |

### mindmap
| Op | Kind | Notes |
|----|------|-------|
| Add/remove child node; edit text | S/A | Tree only — no arbitrary cross edges |
| Indent/outdent (reparent) | S | |
| Set shape/icon if syntax allows | A | |

### timeline
| Op | Kind | Notes |
|----|------|-------|
| Add/remove section / period | S | |
| Add/remove event under period; edit text | S/A | |

### kanban
| Op | Kind | Notes |
|----|------|-------|
| Add/remove/rename column | S/A | |
| Add/remove ticket; edit title/metadata | S/A | |
| Move ticket between columns (reorder) | S | |

### ishikawa
| Op | Kind | Notes |
|----|------|-------|
| Set effect/problem title | A | |
| Add/remove category | S | |
| Add/remove cause under category (and nested cause if supported) | S | |

---

## Beta families

### sankey
Add/remove node · add/remove link with numeric value · edit labels. No cycles; values drive thickness (**S/A/R**).

### xychart
Set title, x/y axes, chart type (bar/line) · add/remove series · edit data vector (**A/S**).

### block
Add/remove block · nest blocks · add/remove edges · set block labels/ids (**S/R/A**). Treat like structured flowchart subset.

### packet
Add/remove field · set bit width & label · reorder fields (layout is sequential bits) (**S/A**). No free 2D move.

### architecture
Add/remove group/service · nest service in group · add/remove edges · icons/labels (**S/R/A**).

### radar
Add/remove axis · add/remove curve · set numeric scores per axis (**S/A**).

### treemap
Add/remove node · set value · reparent (hierarchy) (**S/A**). No cross-tree edges.

### usecase
Add/remove actor / use case / boundary · add/remove link (include/extend/associate) · nest in boundary (**S/R/A**).

### eventmodeling
Add/remove swimlane · add/remove command / event / view on lane · add/remove flow between them · reorder on timeline (**S/R/A**).

---

## Experimental families

### venn
Add/remove set · edit set label · set intersection labels/values where syntax allows (**S/A**). Geometry is library-owned (**V**).

### treeview
Same family as mindmap/treemap hierarchy: add/remove/reparent/rename (**S/A**).

### wardley
Add/remove component · set evolution (x) & visibility (y) · add/remove dependency arrow · move component on map (**S/A/R**). Positions are meaningful (unlike flowchart).

### cynefin
Assign/move item into domain (clear/complicated/complex/chaotic/disorder) · edit item label · set domain notes (**S/A**). Domains themselves are fixed scaffold (**V**).

### railroad
Add/remove rule · edit terms (terminal/nonterminal) · sequence / choice / optional / repeat combinators (**S/A**). Mirror grammar AST, not free graph drawing.

---

## Companion: ears (not Mermaid)

| Op | Kind | Notes |
|----|------|-------|
| Add/remove EARSRequirement | S | |
| Set pattern (ubiquitous/state/event/optional/unwanted/complex) | A | Drives required clauses |
| Edit precondition / trigger / feature / unwantedCondition / system / response | A | Enforce well-formedness (Lean `wellFormed`) |
| Regenerate prose `text` from clauses (or parse prose → clauses) | A | Bidirectional with care |
| Set risk, verifymethod | A | |
| Link to `requirementDiagram` node (`specifiesBody`) | R | Integrating correspondence |

---

## Cross-cutting rules for the editor

1. **Palette = META concepts for the active domain only** (enabled via project settings).  
2. **Every mutating op maps to Core API** (createNode / setAttribute / setPointer / delete); Mermaid string is derived.  
3. **Reject ops Mermaid cannot emit** (e.g. diagonal-only layout tweaks on flowchart).  
4. **Wardley / quadrant / packet** are the exceptions where coordinates or order *are* model attributes.  
5. **requirement vs ears:** edit shall-bodies in ears; edit satisfy/verify graphs in requirement.  
6. **Multi-domain:** creating a `sameAs` / `specifiesBody` correspondence is an Integrating op, not a Mermaid diagram op.

---

## Suggested implementation order (manipulation)

1. flowchart, sequence, state, class, er  
2. requirement + ears  
3. c4, architecture, usecase  
4. gantt, kanban, journey, timeline  
5. Remaining beta/experimental as view-first, edit-second
