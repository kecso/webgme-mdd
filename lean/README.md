# Lean formalization for webgme-mdd

This directory follows the fashion of [`kecso/webgme-lean`](https://github.com/kecso/webgme-lean): **WebGME META → Lean structures**, constraints as predicates/theorems, models as Lean values checked by `rfl` / elaboration.

## Verdict

Yes — Mermaid MDD domains can be formalized the same way. Each `diagrams/<id>/metamodel/Language.json` already is a META sketch; `scripts/generate-lean-domain.js` emits `diagrams/<id>/lean/Domain.lean` beside it. Cross-diagram constraints belong in the **Integrating** layer (see `Integrating/` and `examples/`), matching our [integration-architecture](../docs/findings/integration-architecture.md) finding: generic correspondences + typed rules, not N×N domain packages.

## Layout

| Path | Role |
|------|------|
| `Integrating/Domain.lean` | Small Integrating Language (`SystemElement`, `Correspondence`, `ConstraintInstance`) |
| `examples/S1_participant_binds/` | Worked cross-domain constraint + Lean proof |
| `../diagrams/<id>/lean/Domain.lean` | Per-aspect Lean beside META |

## Check

```bash
# install elan once: https://lean-lang.org/install/
cd lean
lake env lean Integrating/Domain.lean
lake env lean examples/S1_participant_binds/Example.lean
```

Toolchain pin: `lean-toolchain` (Lean 4.12.0, same as webgme-lean).

## Regenerate aspect domains

```bash
npm run generate:lean
# or one package:
npm run generate:lean -- sequence
```
