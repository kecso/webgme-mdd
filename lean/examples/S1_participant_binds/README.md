# Example: Participant binds architecture (S1)

Exemplifies the integration goal: a **Lean-checked constraint** that spans two Mermaid/WebGME aspect domains via the Integrating Language.

| Artifact | Role |
|----------|------|
| `constraints.wgl` | webgme-lean-style DSL statement of the rule |
| `Example.lean` | META structures + models + `theorem … := rfl` |

## Constraint

```text
forall p in Participant:
  exists s in Service:
    corresponds(p, s, "sameAs")
```

- **Good model** `aebGood`: Radar/Fusion/BrakeCtrl each have `sameAs` to an architecture service → theorem proves `true`.
- **Bad model** `aebBad`: extra `V2XGateway` participant with no architecture service / correspondence → theorem proves `false`.

## Check

```bash
cd lean
lake env lean examples/S1_participant_binds/Example.lean
```

Success: exit 0, no output.
