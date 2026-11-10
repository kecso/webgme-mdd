# Requirements specification among MDD domains

## Is there a req-spec language in the Mermaid set?

**No — not as an authoring language.**

What we have is Mermaid **`requirementDiagram`** (`diagrams/requirement/`): a **SysML-v1.6-style visualization / traceability diagram**.

| It does well | It does not do |
|--------------|----------------|
| Requirement *nodes* with id, text blob, risk, verify method, type stereotype | Controlled syntax for writing the requirement *body* |
| Relations: contains, derives, refines, satisfies, verifies, traces, copies | Patterns for triggers, preconditions, unwanted behavior |
| Linking “elements” (design/test stand-ins) to requirements | Interchange (ReqIF), versioning, RM workflows |

So among the Mermaid MDD domains, requirements are **diagrammy containers + links**, not a specification language. The free-text `text:` field is unconstrained English.

That gap matters for webgme-mdd: multi-domain validation needs **atomic, structured shall-statements** that can bind to state/sequence/architecture/events — not only a box labeled “safety req.”

---

## Bleeding-edge / modern options (2024–2026)

| Approach | What it is | LLM fit | Aligns with other MDD domains? | Notes |
|----------|------------|---------|--------------------------------|-------|
| **EARS** (Easy Approach to Requirements Syntax) | Gently constrained English: While / When / Where / If-Then + *shall* | **Excellent** — patterns are promptable; used in AWS Kiro specs, Inflectra.ai scoring, 2025 LLM→EARS papers | **Strong** — maps to state (While), sequence/events (When), optional features (Where), fault paths (If/Then), system subject (architecture/C4) | Lightweight; no specialty tool; industry-proven (Mavin / Rolls-Royce lineage) |
| **SysML v2 textual `requirement`** | First-class textual model element + KerML semantics | Medium — code-like; stakeholders often reject as primary authoring | Strong with MBSE tools; heavier than Mermaid stack | Best as *target* formalization, not daily authoring |
| **ReqIF** | OMG interchange for RM tools | Poor as authoring UX | Good for import/export to DOORS/Polarion | Envelope, not a body language |
| **Gherkin / BDD** | Given/When/Then scenarios | Excellent for acceptance tests | Aligns with sequence/journey/usecase; weaker for non-functional / safety “always” reqs | Complements EARS; not a full RE substitute |
| **Formal (Alloy, TLA+, Event-B)** | Proof-oriented specs | Weak for stakeholder drafting | Strong for selected properties → Lean | Use *after* EARS for critical slices |
| **req (req-lang.org)** | Markup + math properties for problem space | Emerging | Interesting bridge to formal props | Niche vs EARS adoption |
| **OpenReq / NLP dependency mining** | AI over existing NL reqs | Meta-tooling | Orthogonal | Complements, doesn’t replace syntax |

**Bleeding edge that still ships:** EARS + LLM assist (rewrite/score), then optional AI bridge into SysML v2 / model elements (AI4MBSE-style). That is the practical frontier—not inventing another heavy formal RE language.

---

## Recommendation for webgme-mdd: **EARS**

Pick **EARS** as the requirements *specification* domain:

1. **Easy but comprehensive** — five patterns (ubiquitous, state-driven, event-driven, optional feature, unwanted) cover most system/software needs; complex = combinations.  
2. **LLM-friendly** — fixed clause order and keywords; models rewrite NL → EARS reliably; humans still read the result.  
3. **Aligns with most other MDD domains**

| EARS clause | Natural MDD counterparts |
|-------------|--------------------------|
| *While* ⟨precondition⟩ | `state`, journey modes, flowchart guards |
| *When* ⟨trigger⟩ | `sequence` messages, `eventmodeling` commands/events |
| *Where* ⟨feature⟩ | optional architecture/C4 variants, product lines |
| *If … Then* unwanted | fault `state`, ishikawa mitigations, negative sequences |
| *the* ⟨system⟩ *shall* ⟨response⟩ | `architecture` / `c4` / `class` subject; response → behavior diagrams |
| Requirement id + relations | existing `requirementDiagram` satisfies/verifies/refines |

**Architecture in this monorepo**

```text
EARS body (diagrams/ears)          ← authoring / LLM / Lean pattern checks
        │  specifiesBody / refines
        ▼
requirementDiagram node           ← hierarchy + satisfy/verify/trace to design
        │  Integrating correspondences
        ▼
state / sequence / architecture / …
```

Keep Mermaid `requirement` for **traceability graphs**; add **`ears`** as the non-diagram **body language** domain. Do not pretend ReqIF or SysML v2 text is the daily authoring surface for this stack.

**In-repo:** `diagrams/ears/` (META, ImportEARS/ExportEARS, `examples/sample.ears`, `lean/Domain.lean`), catalog entry under `companionLanguages`, Integrating rule `earsSpecifiesRequirement` (`specifiesBody`).

---

## What “comprehensive enough” means here

EARS does **not** replace:

- Goal modeling (KAOS),  
- Full legal/regulatory prose,  
- Quantitative constraint languages (OCL, KerML expressions).

It **does** give a uniform, checkable shape for the shall-statements that our stories’ integration pairs hang on — which is the missing piece relative to Mermaid-only requirement diagrams.
