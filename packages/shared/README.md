# `@webgme-mdd/shared`

Shared helpers for WebGME Mermaid plugins.

| Module | Use |
|--------|-----|
| `src/MermaidAst.js` | AMD: detect/parse/serialize Mermaid |
| `src/MetaBuilder.js` | AMD: AST → Core nodes |
| `src/JsonMetaImporter.js` | AMD: apply webgme-json Language specs |
| `cjs/MermaidAst.js` | CommonJS for Node validation scripts |

RequireJS path (set in each diagram `config.webgme.js`):

```js
'webgme-mdd-shared': './node_modules/@webgme-mdd/shared/src'
```
