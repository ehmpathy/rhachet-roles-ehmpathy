## `.brief: title.vs_brief`
## `.brief: concept.form`

a **concept** may be stored in one of two primary forms, distinguished by the length and completeness of their content:

| form   | role        | description | length scope | typical usage |
|--------|-------------|-------------|--------------|---------------|
| **[brief]** | instance  | a complete, self-contained work that may be of arbitrary length. represents the *full file* body, containing all details, structure, and data needed for its intended use. | unlimited | final documents, source code, datasets |
| **[title]** | reference | a short, single-sentence identifier for a concept. captures the essence or label without providing substantive content. | one sentence | quick reference, index listings, choice menus |

**notes**
- `[brief]` is the “instance” form; `[title]` is the “reference” form.
- concepts can transition between forms — a `[title]` (reference) can later expand into a `[brief]` (instance), and a `[brief]` can be summarized into a `[title]`.
- in storage, `[brief]` consumes more resources and may require versioning; `[title]` is lightweight and suitable for fast retrieval contexts.
