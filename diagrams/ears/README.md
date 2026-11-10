# EARS Requirements Specification (`ears`)

**Not a Mermaid diagram.** This is the webgme-mdd **requirements body language**: [EARS](https://alistairmavin.com/ears/) (Easy Approach to Requirements Syntax).

Mermaid `requirementDiagram` (`diagrams/requirement`) remains the **traceability** view (satisfy / verify / refine). EARS supplies structured *shall* text that LLMs and Lean can check, and that binds cleanly to state / sequence / architecture subjects.

See [`docs/findings/requirements-specification.md`](../../docs/findings/requirements-specification.md).

## Patterns

| Pattern | Shape |
|---------|--------|
| ubiquitous | The ⟨system⟩ shall ⟨response⟩ |
| state | While ⟨precondition⟩, the ⟨system⟩ shall ⟨response⟩ |
| event | When ⟨trigger⟩, the ⟨system⟩ shall ⟨response⟩ |
| optional | Where ⟨feature⟩, the ⟨system⟩ shall ⟨response⟩ |
| unwanted | If ⟨condition⟩, then the ⟨system⟩ shall ⟨response⟩ |
| complex | While …, when …, the ⟨system⟩ shall ⟨response⟩ |

## Layout

| Path | Purpose |
|------|---------|
| `metamodel/Language.json` | WebGME META draft |
| `examples/sample.ears` | S1-oriented EARS sample |
| `lean/Domain.lean` | webgme-lean-style formalization + well-formedness theorems |
| `src/plugins/ImportEARS` | Parse `.ears` → model (draft) |

## Aligns with

`state` (While), `sequence` / `eventmodeling` (When), `architecture` / `c4` (system subject), `ishikawa` / fault sequences (If/Then), `requirement` (trace links).
