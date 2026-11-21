# Hello world: the porch light

A porch light is small enough to follow without a specialty, and it still needs more than one diagram. The switch, the lamp, and the rule that connects them show up in different views. The point of the studio is to notice when those views disagree.

This is a specification sketch. The studio stores the diagrams and is meant to check constraints like the ones below. It does not yet run this example as a packaged demo.

## The system, in one sentence

When the switch is on, the porch light is lit. When the switch is off, the porch light is dark.

Four diagrams are enough:

| View | Diagram | What it is responsible for |
|------|---------|----------------------------|
| The rule | EARS | The requirement, in a sentence with a clear condition |
| The procedure | Flowchart | The steps that read the switch and set the lamp |
| The modes | State | Off and On, and the flip between them |
| The exchange | Sequence | Who tells the switch, and who tells the lamp |

A fifth diagram is optional. A C4 context diagram can name the person outside and the porch as the system. The four above already carry the constraint story.

## The four texts

The same words are used on purpose: `Switch`, `Light`, `On`, `Off`, `flip`. Sameness of spelling is only a hint. The integration section is what makes them the same thing.

**EARS**

```text
# Porch light
REQ-LIGHT [state]
While the Switch is On, the Light shall be lit.

REQ-DARK [state]
While the Switch is Off, the Light shall be dark.
```

**State**

```text
stateDiagram-v2
  [*] --> Off
  Off --> On: flip
  On --> Off: flip
```

**Flowchart**

```text
flowchart TD
  Read[Read the Switch] --> Choice{Switch is On?}
  Choice -->|yes| Lit[Light the lamp]
  Choice -->|no| Dark[Darken the lamp]
```

**Sequence**

```text
sequenceDiagram
  actor Person
  participant Switch
  participant Light
  Person->>Switch: flip
  Switch->>Light: set
```

## What is the same thing

Each diagram owns its own elements. `Light` in the sequence is not automatically the lamp in the flowchart. The integration model gives the system a few anchors, and each diagram element points at the anchor it means.

| Anchor | Reached from |
|--------|----------------|
| Switch | the EARS conditions, the state machine as a whole, the flowchart choice, the sequence participant `Switch` |
| Light | both EARS subjects, the flowchart lamp steps, the sequence participant `Light` |
| flip | the state transitions, the sequence message `flip` |

A typed link records the kind of connection, not only that two names match:

- the sequence participant `Light` is the **same** element as the EARS subject `Light`
- the state `On` **covers** the flowchart step `Light the lamp`
- the state `Off` **covers** the flowchart step `Darken the lamp`
- `REQ-LIGHT` is **satisfied by** the path that reaches `On` and then `set` toward `Light`
- `REQ-DARK` is **satisfied by** the path that reaches `Off`

Those links are the integration specification. Without them, a reader can only guess that the diagrams belong together.

## Constraints that need more than one diagram

A constraint names a rule and the elements it looks at. The elements may sit in different diagrams. Three rules are enough for this porch light.

**The requirement has a scenario.** `REQ-LIGHT` and `REQ-DARK` each need at least one satisfying path. Here those paths are the state mode plus the sequence message that sets the light. A requirement with no such path is uncovered, even if a flowchart somewhere mentions a lamp.

**The mode and the message agree.** `set` toward `Light` is allowed in `On` and in `Off`, and the resulting lamp step has to be the one that mode covers. A sequence that lights the lamp while the only reachable mode is `Off` violates the rule. A flowchart branch with no matching state does too.

**The participants are the system elements.** `Switch` and `Light` in the sequence must be bound to the Switch and Light anchors. A new participant named `Bulb`, with no link, is not yet the porch light, so it cannot satisfy `REQ-LIGHT`.

Each rule is one constraint instance: a rule id, the participants it binds, and a status of holds, violated, or not yet checked. The rule catalog can grow. The place the instance is stored stays the same, because every rule is "this check, over these elements, from whichever diagrams they live in."

## How a project would hold it

Create an empty project, then allow four languages: EARS, state, flowchart, and sequence. Requirements specification (EARS) allows EARS. Finite-state / embedded / UI state allows the state diagram. Process modeling allows the flowchart. API / protocol interaction allows the sequence. Settings → Domains can add them one concern at a time, or by checking the four diagram types directly.

One diagram of each type then holds the text above. The anchors, the typed links, and the three constraint instances belong to the integrating model rather than inside any one of those diagrams. That is the split: diagrams stay the views, and the integration specification is what says they are views of one porch light.

A larger system uses the same split. The [driving stories](../stories/README.md) add architecture, data, hazards, and delivery on top of this shape. [Projects and domains](./projects-and-domains.md) is the studio procedure for creating the project and allowing the languages.
