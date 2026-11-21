# Projects and domains

A project in Markdown System Studio is one system. Its diagrams are the views of that system. A domain is a modeling concern, such as requirements or finite-state behavior, and it decides which diagram languages the project may use.

This page describes the studio as it works today. Cross-diagram constraints are specified separately; the [porch-light hello world](./hello-porch-light.md) shows the shape of that specification.

## Create a project

On the project list, the Create panel asks for a name and a domain.

- **Empty** creates a project with no diagram languages. You add the ones you need afterwards.
- **A named domain** allows the diagram types that belong to that concern. Requirements specification allows EARS. Finite-state machines allows state diagrams. Process modeling allows flowcharts. The hint under the form lists the types that choice allows.

On the WebGME host the name is letters, digits, and underscores, and the project is stored in WebGME. In the local demo the project stays in the browser. Creating opens the project.

An empty project has no diagrams until you add them. A project created from a domain can hold diagrams of the types that domain allows, and you still add each diagram yourself.

## Open, export, and drop

The Open list is the same page. Each row shows the project name, the domains it carries, and how many diagrams it has.

- Open the name to enter the project.
- Export writes a plain project file.
- Drop removes the project from the list. The studio asks you to confirm first.

## Add a domain or a diagram language

Domains and languages already on the project stay. You add more; you do not clear them from this dialog.

1. Open the project.
2. Open **Settings**, then **Domains**.
3. Check a domain, a single diagram type, or both.
4. Confirm.

Checking a domain selects every diagram type that domain allows. A diagram type can also be checked on its own when no selected domain already includes it. Types already allowed, and types brought in by a checked domain, stay checked.

On the WebGME host, confirm mounts each newly allowed diagram as a library. In the demo it only widens what the project may contain.

After that, **New diagram** offers the allowed types. Import accepts a file only when its diagram type is allowed.

## What a domain is for

A domain is not a diagram. Several domains can allow the same diagram, and one system usually needs several domains because one diagram cannot say everything. Requirements, a process, and a state machine are three concerns. Putting them in one project is what makes a later integration check possible: the diagrams can be asked whether they describe the same switch, the same lamp, and the same requirement.

The larger systems this is aimed at are the [driving stories](../stories/README.md). A small system that uses only a few diagrams is the [porch-light hello world](./hello-porch-light.md).
