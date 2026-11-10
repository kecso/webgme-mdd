# Validation UI + LLM assist (deferred)

**Status:** design notes only — implement after MDD **seeds**, **plugins**, and any remaining **visualizer/package** shape are settled.

Related: [lean-formalization.md](./lean-formalization.md), [editor-architecture.md](./editor-architecture.md), webgme-lean, webgme-dss.

---

## 1. Validation (webgme-lean → MDSS)

### Recommendation

**Do not** drop webgme-lean’s RequireJS ConstraintManager / LeanEditor into the React studio.

| Reuse | Rewrite in React |
|-------|------------------|
| `.wgl` dialect, constraint check, Lean program builder, `CheckWithLean` / `lake` runner, message + artifact shape | Constraint editor panel, validation results strip, run actions |
| HTTP ideas from lean `leanllm` / constraint-router | Cross-domain Integrating / `stories.json` check UX |

### Why not classic visualizers

Lean UI is `PanelBaseWithHeader` + jQuery dialogs on stock WebGME chrome. MDSS is a DSS-style React SPA (`client.appDir`). Embedding RequireJS panels fights the host.

### Target contracts

```ts
type Severity = 'error' | 'warning' | 'info';

interface ValidationMessage {
  severity: Severity;
  message: string;
  nodeId?: string;
  nodeName?: string;
  range?: { startLine: number; startColumn: number; endLine: number; endColumn: number };
  ruleId?: string;
  checkId?: string;
}

interface ValidationResult {
  ok: boolean;
  successText?: string;
  error?: string;
  messages: ValidationMessage[];
  artifacts?: { hash: string; label?: string }[];
  kind: 'syntax' | 'lean' | 'cross-domain';
}
```

### Suggested React surfaces

- `ConstraintEditorPanel` — Monaco for `.wgl` / Integrating rules (pattern: existing `SourceEditorPanel`)
- `ValidationResultsStrip` — severity list → select node / source range
- `ValidateAction` — `run(): Promise<ValidationResult>`

### Suggested host API (studio DomainManager / future ValidateRouter)

- `POST /api/validate/constraints` — syntax / META (`ValidateConstraints` analogue)
- `POST /api/validate/lean` — model snapshot + constraints → CheckWithLean-equivalent
- `POST /api/validate/cross-domain` — Integrating / `stories.json` checks (MDD-specific)

### Effort

| Approach | Effort |
|----------|--------|
| Embed webgme-lean visualizers | High (wrong fit) |
| React UI + REST wrapping lean check modules | Medium |
| Monaco tokens / dialog copy only | Low (incomplete) |

### Gate before implementing

Confirm seed + plugin id story (how domain libraries land in a project; how ImportMermaid is invoked per package without collisions). Validation should run against **real Core models**, not only demo fixtures.

---

## 2. LLM assist (complete / explain / suggest)

### Recommendation

Server-side **Assist** router (DSS DomainManager pattern), not browser-only vendor keys. LLM **proposes**; humans **Apply** through existing `DiagramControl` / Monaco gate — never silent Core writes.

```text
Studio → POST /Assist/{complete|explain|suggest}
           → pack: descriptor + sources + rule/Lean failure
           → LLM (structured JSON)
           → validate (parse Mermaid/EARS, META allow-list, optional re-check)
           → return patch + explanation
Studio → human Apply
```

### Modes

| Mode | Use | Grounding |
|------|-----|-----------|
| **complete** | Partial diagram / NL → draft Mermaid or EARS | `descriptor.json` metaConcepts + samples; start with EARS, then sequence/flowchart/architecture |
| **explain** | Constraint / Integrating violations | `ruleId`, `.wgl`, failed slice, Lean predicate; LLM does **not** decide pass/fail |
| **suggest** | Fix proposals | Same + allow-listed ops; prefer minimal patches; re-run deterministic check |

### Output contract (sketch)

```json
{
  "mode": "complete|explain|suggest",
  "explanation": "...",
  "patches": [
    { "diagramKey": "...", "domainId": "sequence", "source": "...", "rationale": "..." }
  ],
  "proposedCorrespondences": [{ "from": "...", "to": "...", "kind": "sameAs" }],
  "confidence": 0.0,
  "needsHumanReview": true
}
```

### UX placement

- Source panel — Assist complete → Monaco diff → Apply
- Inspector / validation strip — explain + fix cards
- Header — Validate then Explain failures (after validation exists)

### Phasing

1. **MVP (can start on Vite middleware):** `/api/assist/*` + EARS/sequence complete + explain/suggest on S1 Lean fixtures
2. **Host:** promote to WebGME `AssistRouter`; wire Export/Import; structured violations from CrossDomainValidate
3. **Later:** Lean-in-the-loop, multi-diagram patches, air-gapped models

### Precedents to draw from

- webgme-lean **`leanllm`**: rule-based constraint explain first, optional LLM for detailed verbosity
- In-repo: EARS as LLM-friendly body language; `descriptor.json`; `stories.json` integrationPairs; `lean/examples/S1_participant_binds`

### Risks

| Risk | Mitigation |
|------|------------|
| Invented META / invalid Mermaid | Schema allow-list + parse/render gate |
| Hallucinated fixes | Re-check after patch; Lean remains authority |
| Silent model corruption | Human Apply only |
| Scope creep | Three modes only until seeds/plugins stabilize |

### Gate before implementing

Same as validation: stable seed/plugin/visualizer package format so assist patches can target real ImportDelta / library-backed diagrams rather than only the demo store.

---

## 3. Sequencing (when unblocked)

1. Finish MDD seeds + namespaced (or otherwise collision-free) plugin invoke.
2. Validation API + React strip (syntax → Lean → cross-domain).
3. Assist MVP on the same host (complete + explain), human Apply only.
