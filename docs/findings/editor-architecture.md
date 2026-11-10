# Streamlined MDD editor (webgme-dss pattern)

## Verdict

Build a **custom React SPA** on **`webgme-engine`** (not the stock WebGME Angular UI), following **[webgme-dss](https://github.com/webgme/webgme-dss)**. Visualize with the free **`mermaid`** npm package. There is **no maintained first-party Mermaid React editor** worth depending on — wrap `mermaid.render` / `mermaid.run` in our own React components.

Pipeline (this phase):

```text
WebGME Core model  →  ExportMermaid / ExportEARS  →  diagram text
                                                    ↓
                                            mermaid.render → SVG
UI edit intents (later) → Core setAttribute / createNode / delete  (source of truth stays WebGME)
```

---

## What webgme-dss teaches us

DSS replaces the generic WebGME chrome with a domain studio:

| DSS piece | Role | webgme-mdd analogue |
|-----------|------|---------------------|
| `StartPage/` welcome + `Projects` / `CreateProject` / `ProjectList` | Custom landing & project management | Same: MDD studio welcome + project list/create |
| `DomainSelector` dialog + `DomainManager` REST + `DomainSelector` plugin | Pick which Modelica domains load into a project (`kind` tags libraries) | Pick which **Mermaid/EARS MDD packages** are imported as libraries |
| `Project` shell: Header / LeftDrawer / CenterPanel canvas / RightDrawer | Main modeling workspace | Diagram browser + Mermaid canvas + inspector |
| React + Redux + react-router + Material-UI; `window.gmeClient` after `onGMEInit` | Custom UI talking to WebGME storage | Same stack shape (modernize React 18+, router 6, MUI 5/6 or equivalent) |
| `webgme-engine` (not full `webgme` GUI) | Headless model server + our SPA | Same |

Key DSS behaviors to copy:

1. **Welcome route** `/` — branding, short product story, user chip, project list.  
2. **Create project** — name + **checkbox list of domains** (in DSS: Modelica packages; here: `flowchart`, `sequence`, …, `ears`).  
3. **Project route** `/p/:owner/:name` — open branch, territory UI.  
4. **Update domains** from project settings / left drawer — call REST that runs library add/remove (DSS `DomainManager.updateProject`).  
5. **Only load domains the project asked for** — mirrors DSS “only domains requested are loaded.”

---

## Proposed shell (screens)

### 1. Welcome

- Product name + one-line pitch (Mermaid MDD / multi-domain WebGME).  
- Auth/user (reuse WebGME `/api/user` like DSS).  
- CTA into project list / create.  
- Optional: link to catalog findings / stories (S1…).

### 2. Project management (small)

- List projects the user can open (DSS `ProjectList`).  
- Create (name + initial domain set).  
- Open → `/p/:owner/:name`.  
- Later: delete/rename (DSS historically weak here — we can do better).

### 3. Project settings (domain set)

- Multi-select of packages from `DomainRegistry` / `diagram-catalog.json` (+ `companionLanguages`).  
- Persist selection the DSS way: project `info.kind` (e.g. `MDD:flowchart:sequence:ears:requirement`) **and/or** Integrating/root attribute `enabledDomains`.  
- Apply via REST router (**`DomainManager`-style**) that:
  - seeds / ensures libraries (`core.addLibrary` once seeds exist),  
  - runs a **`DomainSelector`-analogue plugin** to sync META presence,  
  - does **not** force all 30 packages into every project.

### 4. Main view (diagram studio)

Suggested layout (DSS three-pane, MDD-flavored):

| Region | Content |
|--------|---------|
| Header | Project name, sync/branch, user, Export / Import MDD, settings |
| Left | **Component/diagram browser** — tree of diagram instances by domain; “New diagram” filtered by enabled domains |
| Center | **Active diagram surface** — Mermaid SVG (read path first); later: selection, palette, inline edit |
| Right | **Inspector** — attributes of selected META node; raw Mermaid/EARS source (round-trip); Integrating correspondences |

EARS: same shell, center shows structured requirement list + prose preview (not Mermaid SVG).

---

## Framework choice: Mermaid + React

| Option | Verdict |
|--------|---------|
| **`mermaid` (official, free)** | **Required.** Renderer of record for all Mermaid domains. Use `mermaid.initialize` + `mermaid.render(id, text)`. |
| **Official React package** | `mermaid-js/react-wrapper` exists but is a thin Storybook-era wrapper — **not** an editor. Do **not** build the studio around it. |
| **Community `@lightenna/react-mermaid-diagram`** | Fine for **display-only** embeds; still wraps `mermaid`. Optional dependency. |
| **Our React app** | **Yes** — same reason DSS chose React: full control of welcome/projects/settings/canvas. Call Mermaid from a small `<MermaidView source={…} />` we own. |
| **Stock WebGME visualizers only** | Reject as the primary UX; keep plugins/META for the model layer. |

**React is the right UI framework** for this studio; Mermaid stays the **visualization library**, not the app framework.

Stack suggestion (aligned with DSS, modernized):

- React 18+ SPA (Vite or webpack; DSS used webpack → `public/app.build.js`)  
- react-router for `/` and `/p/:owner/:name`  
- `webgme-engine` + existing `router/` ImportMDD / DomainRegistry  
- `mermaid` ^11/12 for SVG  
- Optional: `@mermaid-js/parser` later for richer AST-aware edits (not required for v1 export→render path)

---

## Data pipeline (v1 = visualize)

```text
[select diagram node in WebGME]
        │
        ▼
ExportMermaid / ExportEARS (or cached mermaidSource / earsSource on node)
        │
        ▼
React MermaidView / EarsView
        │
        ▼
SVG or structured list  (manipulation UI deferred)
```

Mutations (later): UI operation → Core API change → re-export → re-render. Avoid treating the Mermaid textarea as long-term source of truth once Core models exist; keep `mermaidSource` as fidelity cache (already in Import plugins).

---

## Mapping to this monorepo

| Existing | Editor use |
|----------|------------|
| `router/` + `DomainRegistry.json` | Backend of the studio; extend with DomainManager-style REST |
| `diagrams/<id>/` libraries + Import/Export | Per-domain META + export feed for MermaidView |
| `diagrams/ears/` | Companion panel in the same browser |
| `catalog/` | Dev explorer only; studio is a separate SPA (e.g. `studio/` or evolve `router` client) |
| Integrating Language | Cross-diagram links in inspector / validation strip |

---

## Implementation waves (editor)

1. **Shell** — React welcome + project list/create (hard-code domain checkboxes from catalog).  
2. **Settings** — enable/disable domains; stub DomainManager until seeds exist.  
3. **Browse + view** — left tree of diagrams; center Mermaid from Export.  
4. **Manipulation** — per-domain ops from [diagram-manipulation-operations.md](./diagram-manipulation-operations.md).  
5. **Integrating** — show/edit correspondences; run Lean/validation later.

Do **not** block on full bidirectional Mermaid editing before the shell and export→render path work.
