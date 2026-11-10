# Modeling domains, diagram types, and translator couplings

## Verdict

**WebGME / MDSS domains are modeling domains**, not Mermaid diagram packages. Several domains share one diagram type (e.g. `flowchart` under `ci-cd`, `workflows`, `process-modeling`). **Translators** (Import/Export Mermaid/EARS, and later ImportDelta) should be **rooted in a domain→view coupling**, not in the naked diagram id.

| Concept | Meaning | Example |
|---------|---------|---------|
| **Modeling domain** | Concern the project enables as a WebGME library / kind facet | `systems-engineering`, `ci-cd`, `uml` |
| **Diagram type / view language** | Shared syntax surface | `flowchart`, `sequence`, `ears` |
| **Coupling** | Configurable bind: domain knowledge ↔ view language (+ translators) | `ci-cd → flowchart` via ImportMermaid + domain pack |
| **Diagram instance** | Concrete artifact in a project | `ci-cd:flowchart:pipeline-1` |

Catalog source of truth for the many-to-many map: `domainIndex` in [`scripts/diagram-catalog.json`](../../scripts/diagram-catalog.json). Narrative: [domains.md](./domains.md).

---

## Why the old demo was wrong

Treating “enabled domains” as a checkbox list of every `diagrams/<id>` package:

1. Collapses distinct modeling intents that share a view (flowchart × N).  
2. Pushes translators toward “one ImportMermaid per package” with colliding plugin ids.  
3. Makes the left rail a catalog of *possible languages* instead of *project content*.

---

## Couplings (target shape)

```text
ModelingDomain ──configures──► TranslatorPack ──reads/writes──► DiagramType
       │                              │
       │                              ├─ Import*  (view text → Core / domain META)
       │                              └─ Export*  (Core → view text)
       └─ domain knowledge (ops allow-list, META accents, Lean predicates, …)
```

Same `flowchart` text under `ci-cd` vs `business-process` may later map to different META accents or validation packs — that difference lives on the **coupling**, not on a second Mermaid grammar.

Studio demo helpers: `studio/src/data/modelingDomains.js` (`couplingsForDomain`).

---

## Studio UX consequences (MDSS)

| Aspect | Behavior |
|--------|----------|
| **Project Domains settings** | Enable **modeling domains** |
| **Project overview** | List **instances** grouped by modeling domain (not a permanent type catalog) |
| **New diagram** | Floating multi-step: domain → allowed view type → name |
| **Canvas** | Edit one instance; inspector shows domain + view language |

Overview is a **project aspect** (header tab), not a always-on side rail of every diagram family.

---

## Seeds & plugins (follow-on)

When seeds land:

1. WebGME project `kind` / libraries follow **modeling domains**.  
2. Domain seed META may *use* one or more view languages.  
3. Translator plugins should be selectable/configurable **per coupling** (domain knowledge in, diagram knowledge out, and reverse) — even if early implementations still call shared ImportMermaid with a domain pack argument.

Until namespaced plugin ids exist, keep shared Import/Export modules but pass `modelingDomainId` + `domainKnowledgeId` in plugin config.

---

## Related

- [domains.md](./domains.md) — domain ↔ diagram inventory  
- [editor-architecture.md](./editor-architecture.md) — DSS shell  
- [validation-and-llm.md](./validation-and-llm.md) — assist/validate deferred notes  
- [diagram-manipulation-operations.md](./diagram-manipulation-operations.md) — per-view ops (later domain-filtered)
