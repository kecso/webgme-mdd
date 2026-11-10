# Integration architecture: generic glue vs domain×domain

**Question.** For webgme-mdd stories that combine many Mermaid aspect domains, should integration be:

1. a **small generic integration domain** that can connect any ingredient domains, or  
2. a **domain × domain** pattern (specialized bridge metamodel / language per pair)?

**Short answer.** Prefer a **hybrid**: one thin **Integrating Language** (generic correspondences + identity anchors + multi-end constraints) plus a **catalog of typed correspondence rules** (pair-/n-ary semantics). Do **not** build a full DSML per diagram pair unless a pair carries first-class domain content that is not just “A relates to B.”

This matches ISO/IEC/IEEE 42010 (correspondences + correspondence rules), SysML (one model, many diagram kinds, cross-cutting `allocate` / `satisfy` / `refine` / `verify`), OSLC (small set of typed links, open-ended targets), and WebGME’s own pointers/sets/libraries/crosscuts.

---

## 1. What decides how diagrams refer to each other?

Three mechanisms appear in industrial multi-view design. They are not mutually exclusive; the deciding factor is **where system identity lives**.

| Pattern | Where is “the same thing”? | How views relate | Seen in |
|---------|----------------------------|------------------|---------|
| **A. Shared element (single model)** | One object, many diagram presentations | Diagrams are *views* of the same node; no inter-diagram pointer needed | SysML/UML tools: a Block appears on IBD, req, and seq as the same element |
| **B. Correspondence / typed link** | Separate objects per view; an explicit relation binds them | Binary or n-ary link with a **role/type** (`satisfies`, `allocates`, `refines`, `executesOn`) | ISO 42010 correspondences; SysML dependencies; OSLC link types; megamodel CD–SD links |
| **C. Projection / filtering** | Rich model in one tool; peer tools see a filtered façade | Only a minimal interface subset is shared | MBAT / EAST-ADL–Stateflow RTP recipes; “expose requirements, not whole tables” |

### What decides A vs B vs C?

1. **Tool/document boundary**  
   - Same repository / same WebGME project composition tree → **A** is cheapest (one node, multiple visualizers/aspects).  
   - Separate Mermaid files / separate domain libraries → **B** is required (libraries are read-only namespaces; instances live in the host project).  
   - External tools (DOORS, simulation) → **C** or OSLC-style **B**.

2. **Whether the aspect is a true projection or a reification**  
   - Sequence *lifeline* of ECU_X vs architecture *service* ECU_X: same system portion → bind by **identity correspondence** (or shared host object).  
   - Packet *field* `stVal` vs ER *attribute* `statusValue`: same information under different schemas → correspondence with **mapping payload** (rename/type), still generic link + attributes, not a new DSML.  
   - GOOSE vs MMS roles on the same edge: the *meaning of the edge* is pair-specific → still one `Correspondence` type, but a **typed rule** / stereotype (`GoosePeer`, `MmsVertical`) carries the semantics.

3. **Cardinality and ownership of the relation**  
   - 1:1 rename/identity → thin `sameAs` / `refines`.  
   - Many:many traceability → sets / matrices (SysML allocation / satisfy matrices).  
   - Relation that *is* the engineering artifact (e.g. a full ICD mapping table with versioning) → that table may deserve its **own** mini-domain (still not “sequence×packet DSML,” but an **InterfaceContract** aspect).

### Implication for Mermaid → WebGME

Mermaid diagrams are **separate documents**, so pure SysML-style shared elements do not appear until ImportMDD materializes them. After import you should choose:

- **Promote shared identity into a host “SystemElement”** (Integrating Language) that aspect instances **point to**, or  
- Keep aspect instances and add **Correspondences** between them.

For webgme-mdd stories, **both** are useful:

- Host `SystemElement` / `AspectAnchor` for “this is the BrakeCtrl” (identity).  
- Typed `Correspondence` edges for “this sequence Message satisfies that Requirement” (relation).

Domain×domain full languages are only justified when the *relation itself* has rich structure (ICD, allocation budget, assurance case argument) — then make that an **aspect domain**, not N² bridges.

---

## 2. Do diagrams share elements that cover the same system portion?

**Yes, semantically — often; physically in Mermaid — no.**

From the stories:

| Shared system portion | Appears as… in different diagrams | Integration need |
|-----------------------|-----------------------------------|------------------|
| ECU / service / actor | C4 container, architecture service, sequence participant, class, state machine owner | Identity anchor |
| Safety requirement | requirement node; refined by use case; verified by sequence; allocated to architecture | Typed links (`refine` / `satisfy` / `verify` / `allocate`) |
| Mode / operational state | state vertex; journey step; sequence fragment guard; flowchart decision | Mode consistency correspondences |
| Payload / LN / field | ER attribute, packet field, sequence message args, class property | Schema/interface correspondence (+ optional ICD aspect) |
| Hazard / cause | ishikawa cause; requirement risk control; missing state/alarm path | Hazard→design coverage links |
| Event / command | eventmodeling event; sequence message; C4 broker edge | Vocabulary unity links |

SysML’s lesson: **the diagram is not the model**. Once in WebGME, Prefer **one host identity** for “BrakeCtrl” and aspect-specific *facets* (or library instances that `refersTo` the host), rather than forever syncing N clones by name string.

Name-equality heuristics are a bootstrap only (ImportMDD can propose correspondences); durable semantics need explicit links or shared anchors.

---

## 3. How do constraints refer to multiple diagrams?

This is the driving force of the integration stories. Literature splits **where the constraint lives** from **what it binds**.

### 3.1 Where constraints live

| Placement | Pros | Cons |
|-----------|------|------|
| **Inside one aspect domain** | Local well-formedness (e.g. every Edge has src/dst) | Cannot see other libraries’ types |
| **Generic Integrating Language** | One place for multi-end rules; works with any library set | Needs a stable way to name participants and rule kinds |
| **Pair-specific bridge DSML** | Can hard-code META targets (Sequence.Message → C4.Container) | Explodes as O(N²); brittle when libraries version |
| **Validator plugin / megamodel rules** (not META) | Full programmatic power; matches 42010 “methods for checking” | Must still *find* declared correspondences in the model |

Recommendation: **declare** multi-diagram constraints in the Integrating Language (or as registry data that ImportMDD/CrossDomainValidate loads); **evaluate** them in plugins. META alone rarely expresses “∀ message ∃ container” well; 42010 explicitly allows correspondence *rules* plus checking methods.

### 3.2 How a constraint points at multiple diagrams

Use an n-ary pattern (ISO 42010 correspondence with multiple AD elements; WebGME **sets** + attributes):

```text
ConstraintInstance (Integrating Language)
  attributes: ruleId, severity, status (holds|violated|unknown)
  set participants: [ nodes from any domain library ]
  optional pointers: evidence, rationale
```

Examples mapped from stories:

| Rule id (from stories) | Participants (min) | Holds when |
|------------------------|--------------------|------------|
| `req-scenario-coverage` | Requirement, UseCase and/or Sequence | every high-risk req has ≥1 scenario participant linked |
| `participant-binds-container` | Sequence.Participant, C4.Container\|Architecture.Service | correspondence of type `sameAs`/`roleOf` exists |
| `mode-message-compatibility` | State, Message | message not in forbidden set for active state |
| `goose-vs-mms-topology` | Sequence.Message, Architecture.Edge | link stereotype matches bus role |
| `hazard-to-risk-control` | Ishikawa.Cause, Requirement | every cause has control req (+ allocated design) |

The **rule catalog** is domain×domain (or n-ary) *knowledge*; the **storage metamodel** for “this constraint instance + these participants” stays generic.

### 3.3 Relation to OSLC / megamodels

- OSLC: few **typed links**, open-ended ranges, validate expected types gracefully — same as “generic link + suggested target kinds.”  
- Megamodels: models as nodes, **relationship types** as edges (CD–SD); slicing walks links. Pair types label edges; they are not full DSMLs.  
- SysML: cross-cutting dependencies are first-class but **few** stereotypes; matrices visualize many instances.

---

## 4. Decision framework for webgme-mdd

```text
Does the relation carry rich standalone content
(ICD table, assurance argument, budget allocation)?
        │
        ├─ YES → Aspect domain of its own (InterfaceContract, AssuranceCase, …)
        │         still linked via generic Correspondences to ingredient domains
        │
        └─ NO  → Is it only identity / trace / allocate / satisfy / verify / refine?
                   │
                   ├─ YES → Generic Integrating Language
                   │         + typed Correspondence.kind / Constraint.ruleId
                   │         + optional META pointer_meta hints per kind
                   │
                   └─ Rare: extremely closed pair with custom UI/validation
                            → small mixin or decorator on Correspondence
                            → still avoid a whole domain×domain package
```

### What goes in the Integrating Language (small)

Suggested META sketch (webgme-json style concepts):

| Concept | Role |
|---------|------|
| `SystemElement` | Host identity for a real-world/system portion |
| `AspectRef` | Pointer from an aspect instance to `SystemElement` (or inverse set) |
| `Correspondence` | Typed link: `kind`, pointers/set `ends` (2..n) |
| `CorrespondenceRule` | Catalog entry: `ruleId`, arity, expected end roles, description |
| `ConstraintInstance` | Binding of a rule to concrete ends; `status`, `severity` |
| `Evidence` | Optional link to test/sequence/gantt verification artifact |

Ingredient domains (`diagrams/sequence`, etc.) stay pure. Router `ImportMDD` ensures libraries + proposes `AspectRef` / `Correspondence` from name matching. A later `CrossDomainValidate` plugin evaluates `ConstraintInstance`s / applies rules from `stories.json` `integrationPairs`.

### What stays domain×domain (as data, not packages)

- `integrationPairs` and validation check ids already in `docs/stories/stories.json`  
- Suggested META target types per `Correspondence.kind` (documentation or soft pointer_meta)  
- Plugin logic branches (`if kind === 'goose-vs-mms-topology'`)

That is **domain×domain knowledge**, not **domain×domain repositories**.

---

## 5. Answers to the two focus questions

### Q1 — What decides references, and do they share elements?

- **Decider:** whether views share a **tool identity** (then share/reuse one WebGME node), or only a **system identity** (then correspondence / `AspectRef` to a host `SystemElement`).  
- Mermaid imports start as separate instances → treat them as **reifications** of the same portion until explicitly anchored.  
- Same portion of the system (ECU, req, mode, payload) **should** be one semantic identity; diagrams contribute aspects, they should not forever be unrelated clones.

### Q2 — How do constraints span multiple diagrams?

- Store constraints as **n-ary objects in the Integrating Language** (participants set + `ruleId`), not as edges trapped inside one aspect META.  
- Encode pair-/story-specific meaning as **rule catalog + evaluator**, aligned with ISO 42010 correspondence rules and SysML/OSLC typed relations.  
- Evaluation is a WebGME plugin walking participants across library namespaces — that *is* the integration story’s driving force.

---

## 6. Practical recommendation for this monorepo

| Build | Deliverable |
|-------|-------------|
| 1 | New package `diagrams/integrating` (or `router` META) with the small Integrating Language above |
| 2 | Keep aspect packages independent; ImportMDD adds them as libraries and creates `SystemElement` + proposed correspondences |
| 3 | Drive validators from `stories.json` `integrationPairs` / `validationChecks` (domain×domain *rules*) |
| 4 | Only add extra aspect domains when the *relation* is itself a product artifact (ICD, assurance case, budget) |

**Avoid:** `diagrams/sequence-x-c4`, `diagrams/packet-x-architecture`, … as separate WebGME projects.

**Prefer:** one Integrating Language + story-scoped rule sets + optional rich aspect domains for heavyweight contracts.

---

## References (anchors)

- ISO/IEC/IEEE 42010 — architecture views, **correspondences**, **correspondence rules**, consistency recording  
- OMG SysML — single model / many diagram kinds; cross-cutting `allocate`, `satisfy`, `refine`, `verify`, `trace`; allocation/satisfy matrices  
- OSLC linking profiles — few typed directional links, open-ended ranges, graceful type mismatch  
- Heterogeneous megamodel slicing — models + typed relationships as a graph; pair types label edges  
- WebGME — libraries/namespaces, pointers & sets for cross-hierarchy links, mixins, crosscuts as association editors  
- MBAT / EAST-ADL–Stateflow RTP — expose filtered façades; conceptual common meta for alignment, not full model merge  
