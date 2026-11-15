# Change management plan

How a diagram edit becomes a WebGME commit, then a re-render. Two ways in, one commit shape. **Text-initiated change is the path we will build.** Visual editing is parked.

This plan stops before library import and project initialization. Those are a separate check of the WebGME-backed execution.

Related: [diagram-manipulation-operations.md](./diagram-manipulation-operations.md) (which ops are legal per diagram), [editor-architecture.md](./editor-architecture.md) (studio shell), [mermaid-embed-and-overlay.md](./mermaid-embed-and-overlay.md) (what the canvas can hit).

## Shared commit shape

One user action ends in one commit. The action may call the core more than once (create a node and set its pointers). After the commit, the same translator exports the model and the canvas renders that text.

The grammar-visible children are the diff domain. A note, a registry position, or an integrating aspect that the parser cannot see is kept. A rename of a name token keeps the node. A rewritten line is a delete plus a create.

Order is stored on the model. Child relids are not the sequence. Positional elements (messages, edges, members) get an explicit order, and the exporter sorts by it.

## Text-initiated change

The source panel stays the editor. Typing does not touch the model. **Apply** diffs the baseline against the draft.

### What the diff is

A line-and-token diff at Apply time, not a replay of Monaco keystrokes. Monaco can emit the raw range of each edit (`range`, `rangeLength`, `text`), and the panel currently discards that and keeps only the full draft. The Apply-time diff classifies the same cases in one pass:

| Class | Meaning for the model |
|-------|------------------------|
| Line inserted or deleted | Shift the order of the untouched lines. Do not rematch them. |
| Line moved (same text removed in one place and inserted in another) | Keep the node. Rewrite order. |
| Token replaced inside an otherwise identical line | Rename, or retarget one endpoint. The node stays. |
| Whole line rewritten | Delete the old element and create the new one. |

Identical neighbors are why the diff exists. Two `U->>API: ping` lines are only separated by occurrence. Inserting a third between them must leave the old nodes in place and rewrite order.

### Match keys

| Kind of element | Key |
|-----------------|-----|
| Named (state, participant, class, flowchart node) | The name in the grammar. Changing that token is a rename of the same node. |
| Between two names (transition, flowchart edge, relationship) | The endpoint pair, plus the label when the pair repeats. An edit on one endpoint token retargets the pointer. |
| Position under a named parent (sequence message, class member) | Place in the ordered list. The commit writes that order onto the surviving nodes. |

Then: update attributes and pointers on the pairs, create what the text added, delete what the text dropped, write order, commit, export, render.

### What is true in the code today

- Flowchart nodes and sequence participants already have stable names. Flowchart edges are `e` plus the line index. Sequence messages are `m` plus the line index. Those index keys shift on insert, so they cannot be the match key.
- State, class, ER, requirement, C4, architecture, usecase, and the rest of the catalog go through `parseGeneric` (raw lines). There is no element to pair. A diff there would replace the diagram.
- `serializeFromCore` is not the inverse of `parse`. State export becomes a comment line, and every export appends `exported from WebGME`. The text written back has to be text the parser will match.

### Iterations, by story

Each iteration adds parsers and exporters that round-trip the matched elements, then the Apply diff for those diagrams. Required diagrams only. Optional diagrams wait.

**S1 — Automotive AEB / CACC.** Required: `flowchart`, `sequence`, `state`, `class`, `er`, `ears`, `requirement`, `usecase`, `c4`, `architecture`.

1. `flowchart` and `sequence`. Parsers exist. Replace index keys with the match keys above. Write message and edge order. Prove insert, move, and endpoint rename on the S1 samples (`obstacle-brake`, `driver-scenarios`).
2. `state`. Parse states by name and transitions as endpoint pairs. The Mermaid description is one string. `event`, `guard`, and `action` are our meta fields, not Mermaid grammar. Until a composer exists, the description is one attribute.
3. `class` and `er`. Names, members in order, relationships as endpoint pairs.
4. `ears` and `requirement`. EARS is clauses, not Mermaid. Identity is the requirement id.
5. `usecase`, `c4`, `architecture`.

**S3 and S5** add `packet` and `ishikawa` to the S1 set. **S2** adds `block` and `ishikawa`. **S4** adds `eventmodeling` and `journey`. Those diagrams get a parser when that story is the one being built. `block` is optional on S1 and required on S2.

## Visual editing (parked)

The canvas overlay is a hit target, not the editor, until the text path round-trips. The ideas below are the ones to pick up later. They are not scheduled.

A right-click menu on a hit box, with no drag gestures. One menu action, one commit. The menu is driven by a JSON document next to each `Language.json`, checked against that language’s concepts and attributes. A diagram whose operation cannot be described that way can stay a static implementation. A plugin per operation is the outcome to avoid.

The menu talks in meta names (`Transition`, `Transition.event`). A resolver turns the overlay id (`edge:start`, `message:ObstacleDetect`) into the node. The index today is one rectangle per id and keeps the first when ids collide, so an attribute inside a node is not its own hit target.

Parked operations:

- **Edit attributes.** One dialog lists the node’s valid attributes, a field per type, and writes the changes in one commit. This is the way `event`, `guard`, and `action` are edited while the picture still shows one label.
- **Delete.** `deleteNode` on the resolved node.
- **Create.** The menu names the concept. The parent is the target when containment allows it, otherwise the diagram. Mermaid places the new element when the model is exported. A click-to-place stage is only for a diagram whose coordinates are part of the model.
- **Edges.** Preferred parked form: the endpoints are attributes of the edge, chosen from a dropdown of the legal targets, and the edge kind is an attribute on the same form. The other form, if a dropdown is the wrong gesture: the menu starts a second stage, the legal targets highlight, left click sets the pointer, right click cancels and does not open another menu.

Create-under-the-diagram is not enough for a sequence message. The message has to land between two others. That position is why the text path comes first: line order is the position, and the visual menu would have to grow a diagram-specific insert rule.

## Out of this plan

Library add and remove, the `mdd` seed, and whether project creation mounts the languages the domain asks for. Next check, after this plan, is how that WebGME-backed execution stands.
