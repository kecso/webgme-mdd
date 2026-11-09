# Class Diagram (`class`)

WebGME project housing a DSML metamodel for Mermaid **Class Diagram**.

## Mermaid keywords

- `classDiagram`

## Status

`stable`

## Domains

- object-oriented-design
- uml
- software-architecture
- domain-modeling

## Capabilities

- Classes with members and methods
- Visibility (+/#/-/~), stereotypes, generics
- Relationships: inheritance, composition, aggregation, association, dependency, realization
- Cardinality annotations
- Namespaces / packages

## Syntax highlights

```mermaid
classDiagram
class Animal { +String name +eat() }
Animal <|-- Dog
Owner "1" --> "*" Animal : owns
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
