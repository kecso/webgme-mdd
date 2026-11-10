# Lean formalization of MDD domains (webgme-lean fashion)

**Source evaluated:** [`kecso/webgme-lean`](https://github.com/kecso/webgme-lean) — “Formal verification for WebGME models using Lean theorem prover” (Lean 4.12).

## Verdict

**Yes.** The Mermaid MDD domains already sketched as WebGME META (`diagrams/<id>/metamodel/Language.json`) can be formalized **the same way** webgme-lean formalizes StateChart:

| webgme-lean step | webgme-mdd analogue |
|------------------|---------------------|
| META nodes → Lean `structure` / `extends` | Generate from `Language.json` → `diagrams/<id>/lean/Domain.lean` |
| Containment → `_Contained` / child sum types | `_childIds` + optional sum types (generator scaffold) |
| Pointers `src`/`dst` → typed fields | Pointers as `_NodeId` (bind across domains via Integrating) |
| `.wgl` constraints → Lean `Bool` predicates + `theorem … := rfl` | Per-domain constraints + **cross-domain** rules in Integrating |
| Seed models as Lean values | Story seed models (see `lean/examples/`) |

Cross-diagram validation does **not** require Lean packages per diagram pair. It requires:

1. Aspect Domain.lean files (ingredient META), and  
2. Integrating Language + rule predicates (as in [integration-architecture.md](./integration-architecture.md)), checked like webgme-lean examples.

## What we added in-repo

| Location | Content |
|----------|---------|
| `diagrams/<id>/lean/Domain.lean` | Generated Lean beside META for priority domains |
| `diagrams/<id>/metamodel/descriptor.json` → `leanDomain` | Pointer to the Lean artifact |
| `lean/Integrating/Domain.lean` | `SystemElement`, `Correspondence`, `ConstraintInstance`, `participantBindsArchitecture`, `earsSpecifiesRequirement` |
| `lean/examples/S1_participant_binds/` | `.wgl` + Lean proof that S1 sequence↔architecture binding holds/fails |
| `diagrams/ears/lean/Domain.lean` | EARS companion language: patterns + `wellFormed` / `allWellFormed` theorems |
| `scripts/generate-lean-domain.js` | META → Lean generator (`npm run generate:lean`) |

## Exemplar constraint (what we are aiming for)

From S1 (`sequence` participant must exist as `architecture` service):

```text
forall p in Participant:
  exists s in Service:
    corresponds(p, s, "sameAs")
```

Encoded in `lean/examples/S1_participant_binds/Example.lean`:

- `ParticipantBindsArchitecture` — Bool predicate over an integrated model  
- `theorem aeb_good_satisfies_participant_binds : … = true := rfl`  
- `theorem aeb_bad_violates_participant_binds : … = false := rfl` (missing V2X binding)

That is the driving force: **one proof obligation mentioning elements from multiple aspect domains**, mediated by Integrating correspondences — not a `sequence-x-architecture` DSML.

## How to extend

1. Refine `Language.json` for a domain → `npm run generate:lean -- <id>`.  
2. Add `.wgl` constraints (webgme-lean dialect) under `diagrams/<id>/lean/` or story folders.  
3. For multi-domain rules, add predicates next to `IntegratingDomain` / story examples; wire `stories.json` `integrationPairs` `check` ids to those predicates.  
4. Optionally depend on webgme-lean as a WebGME component later for Constraint Editor + CheckWithLean plugins against a combined META (aspect libraries + Integrating).

## Limits / honesty

- Generated Domain.lean is a **scaffold** (pointers as `_NodeId`, containment as id lists) — enough to sit beside META and type-check; richer `src : State` style fields (as in webgme-lean Turnstile) can be hand-tuned per domain.  
- Full webgme-lean pipeline (GenerateConstraintLanguage plugin, Monaco editor) is not vendored here; we mirror its **Lean fashion** and keep a path to adopt the tooling.  
- Not every Mermaid beta/experimental diagram needs Lean on day one — prioritize story **requiredDiagrams**.
