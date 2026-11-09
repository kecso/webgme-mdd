# Sequence Diagram (`sequence`)

WebGME project housing a DSML metamodel for Mermaid **Sequence Diagram**.

## Mermaid keywords

- `sequenceDiagram`

## Status

`stable`

## Domains

- software-interaction
- protocols
- api-design
- uml
- distributed-systems

## Capabilities

- Participants and actors with aliases
- Sync/async/dashed messages
- Activation boxes
- Notes, loops, alt/opt/par/critical/break fragments
- Autonumber, create/destroy participants

## Syntax highlights

```mermaid
sequenceDiagram
participant A as Client
A->>+B: request
B-->>-A: response
alt ok ... else ... end
```

## Layout

| Path | Purpose |
|------|---------|
| `metamodel/Language.json` | webgme-json metamodel draft |
| `examples/sample.mmd` | Canonical Mermaid sample |
| `src/plugins/ImportMermaid` | Mermaid text → model |
| `src/plugins/ExportMermaid` | model → Mermaid text |
| `src/plugins/ApplyLanguageMeta` | Apply Language.json via Core |

## Run (requires MongoDB)

```bash
npm install
# from repo root or this package after workspace install
npm start
```

Then open the configured WebGME port, create a project from this seed/language, run **ApplyLanguageMeta**, then **ImportMermaid**.
