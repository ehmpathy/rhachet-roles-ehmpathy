## `.brief: ref.vs_brief`
## `.brief: concept.form`

a **concept** may be stored in one of two primary forms, distinguished by the length, completeness, and intended usage of their content:

| form     | role        | description | length scope | typical usage |
|----------|-------------|-------------|--------------|---------------|
| **[brief]** | instance  | a complete, self-contained work that may be of arbitrary length. represents the *full file* body, containing all details, structure, and data needed for its intended use. | unlimited | final documents, source code, datasets |
| **[ref]**   | reference | a short, single-sentence concept reference. names or anchors a concept without providing substantive content. | one sentence | quick reference, index listings, choice menus |

**notes**
- `[brief]` is the **instance** form; `[ref]` is the **reference** form.
- concepts can transition between forms — a `[ref]` (reference) can later expand into a `[brief]` (instance), and a `[brief]` can be condensed into a `[ref]`.
- in storage, `[brief]` consumes more resources and may require versioning; `[ref]` is lightweight and suitable for fast retrieval or indexing contexts.

---

## examples

---

**[ref] example**
\`\`\`md
raspberry
\`\`\`

**[brief] example**
\`\`\`md
# `.brief: raspberry`

## .what
a **raspberry** is a small, edible fruit composed of numerous tiny drupelets, typically red, black, purple, or golden in color. it grows on the perennial plant *rubus idaeus* and related species.

## goal
to provide nutrition, flavor, and culinary versatility as a fruit in human diets.

## core elements
1. **botanical family** — rosaceae
2. **growth habit** — perennial shrub with biennial canes
3. **nutritional value** — rich in fiber, vitamin c, and antioxidants
4. **culinary uses** — eaten fresh, made into jams, baked goods, or beverages
\`\`\`

---

**[ref] example**
\`\`\`md
duck
\`\`\`

**[brief] example**
\`\`\`md
# `.brief: duck`

## .what
a **duck** is a waterfowl belonging to the family anatidae, characterized by its broad bill, webbed feet, and short legs. ducks are found worldwide in both freshwater and marine environments.

## goal
to thrive as part of aquatic ecosystems and serve as a source of food, feathers, and cultural symbolism for humans.

## core elements
1. **habitat** — lakes, rivers, marshes, and coastal waters
2. **diet** — aquatic plants, invertebrates, and small fish
3. **behavior** — dabbling, diving, migratory patterns
4. **human uses** — meat, eggs, feathers, ornamental breeding
\`\`\`

---

**[ref] example**
\`\`\`md
ship
\`\`\`

**[brief] example**
\`\`\`md
# `.brief: ship`

## .what
a **ship** is a large vessel designed for transporting people, cargo, or equipment across bodies of water. ships can be powered by sails, engines, or other propulsion methods.

## goal
to facilitate transportation, trade, exploration, and defense across oceans, seas, and other navigable waters.

## core elements
1. **types** — cargo ship, passenger ship, warship, research vessel
2. **propulsion** — sail, steam, diesel, nuclear
3. **construction materials** — wood, steel, composite materials
4. **functions** — commerce, military, scientific research, recreation
\`\`\`
