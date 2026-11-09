# Packet Diagram (`packet`)

WebGME project housing a DSML metamodel for Mermaid **Packet Diagram**.

## Mermaid keywords

- `packet`
- `packet-beta`

## Status

`beta`

## Domains

- networking
- protocols
- binary-layouts

## Capabilities

- Bit-field packet layouts
- Start-end bit ranges with labels

## Syntax highlights

```mermaid
packet-beta
0-15: "Source Port"
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
