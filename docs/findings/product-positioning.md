# Product positioning — Markdown System Studio

## Why not only “webgme-mdd”?

The monorepo still *houses* Mermaid domains in WebGME. The **product surface** users care about—especially when we center the [validation stories](../stories/README.md)—is closer to:

> **Markdown System Studio (MDSS)** — author and integrate system views as Markdown/Mermaid (plus EARS), validate them together, and **publish the project as a browsable Markdown book**.

| Name fragment | What it signals |
|---------------|-----------------|
| **Markdown** | Mermaid + EARS + prose live as text; Git-friendly; LLM-friendly |
| **System** | Multi-view MBSE (req, architecture, behavior, data)—our stories, not doodles |
| **Studio** | DSS-style shell: projects, domain set, canvas widget, controlled apply |

`webgme-mdd` remains the accurate *platform/repo* label (WebGME metamodels + ImportMDD). **MDSS** is the studio product name.

Alternatives considered: *Mermaid System Studio* (too diagram-tool), *Storybook for systems* (collides with UI Storybook), *webgme-dss for Mermaid* (accurate heritage, weak Markdown/book story).

---

## Central feature: project → browsable MD book

A project is already a set of Markdown-shaped artifacts (`.mmd` / `.ears`) plus Integrating links. Exporting a **book** makes that the shareable deliverable:

```text
book/
  README.md          # title, story pitch, domain set
  SUMMARY.md         # TOC (mdBook / GitBook style)
  chapters/
    01-ears-….md
    02-requirement-….md
    …
  traces.md          # TODO: Integrating correspondences as prose tables
```

Each chapter embeds the live source in fenced code (` ```mermaid ` / ` ```ears `) so GitHub, mdBook, Quarto, or our in-studio **Book preview** can render it.

**Why this fits the stories:** S1–S5 are literally multi-chapter system narratives (req → architecture → behavior → data). The book is the readable spine; WebGME is the consistency engine behind it.

### Waves

1. **Now:** client-side book build + in-studio preview + download `.md` bundle (demo store).  
2. **Next:** seed chapters from story templates; include validation checklists.  
3. **Later:** WebGME export plugin writes book to blob/repo; CI publishes mdBook/Pages.

---

## Branding in-repo

| Surface | Name |
|---------|------|
| Studio UI | **Markdown System Studio** (MDSS) |
| npm workspace | `@webgme-mdd/studio` (package id stable for now) |
| Repo / metamodel monorepo | webgme-mdd (unchanged until you rename the remote) |
