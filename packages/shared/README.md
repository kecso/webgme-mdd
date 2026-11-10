# `@webgme-mdd/shared`

Shared helpers for WebGME Mermaid plugins.

| Module | Use |
|--------|-----|
| `src/MermaidAst.js` | AMD: detect/parse/serialize Mermaid |
| `src/EarsAst.js` | AMD: parse/serialize EARS requirements text |
| `src/MetaBuilder.js` | AMD: AST → Core nodes |
| `src/JsonMetaImporter.js` | AMD: apply webgme-json Language specs |
| `cjs/MermaidAst.js` | CommonJS for Node validation scripts |
| `cjs/EarsAst.js` | CommonJS EARS parser for tooling/tests |

RequireJS path (set in each diagram `config.webgme.js`):

```js
'webgme-mdd-shared': './node_modules/@webgme-mdd/shared/src'
```
