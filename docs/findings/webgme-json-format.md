# WebGME JSON metamodel format (used here)

This monorepo drafts META using the JSON shape documented by
[deepforge-dev/webgme-json-importer](https://github.com/deepforge-dev/webgme-json-importer)
(`src/common/README.md`). That project’s **SetStateFromJSON** / JSONImporter can sync a WebGME node tree to this document.

## Node object (informal)

```json
{
  "id": "@meta:ConceptName",
  "attributes": { "name": "ConceptName", "label": "" },
  "attribute_meta": {
    "name": { "type": "string" },
    "label": { "type": "string" }
  },
  "pointers": { "base": "@meta:Other" },
  "pointer_meta": {
    "src": {
      "@meta:Node": { "min": -1, "max": 1 },
      "min": 1,
      "max": 1
    }
  },
  "children_meta": {
    "min": -1,
    "max": -1,
    "@meta:Child": { "min": -1, "max": -1 }
  },
  "registry": { "position": { "x": 100, "y": 120 } },
  "sets": {},
  "mixins": [],
  "children": []
}
```

### Identity (`id`)

| Form | Meaning |
|------|---------|
| `@meta:Name` | META node named `Name` |
| `@name:Name` | Child with attribute `name=Name` |
| `@attribute:attr:value` | Child matched by attribute |
| `@id:LocalId` | Another node in the same JSON doc |
| `/1/2` | Absolute WebGME path |

## How webgme-mdd uses it

- Each diagram ships `metamodel/Language.json` as a **Language** container with `@meta:*` children.
- Plugin **ApplyLanguageMeta** applies that file through `packages/shared` `JsonMetaImporter` (Core API).
- For production-grade sync (diff/update), prefer depending on `webgme-json-importer` directly and pointing SetStateFromJSON at the same files.

## Instance JSON (models)

Instance documents follow the same schema but set `"pointers": { "base": "@meta:…" }` on each object. Example pattern from upstream `nodes_edges.json`:

```json
{
  "attributes": { "name": "Example" },
  "children": [
    {
      "id": "@id:A",
      "attributes": { "name": "A" },
      "pointers": { "base": "@meta:Node" }
    }
  ]
}
```

ImportMermaid builds equivalent structure via Core rather than emitting intermediate instance JSON, but exporters can be extended to emit this format for tooling interoperability.
