# rule.prefer.root-leaf

## .what

when you sort the members of a catalog, a rule set, or a toolkit by how widely each applies, tier each one **root** or **leaf**:

- `root` — the many depend on it: a common case breaks without it, in most repos. reach for these first
- `leaf` — one branch depends on it: it earns its cost in one kind of repo or one kind of load

## .why

- **the pair names a shape, not a grade.** a leaf is not worse than a root; it sits further out, where fewer cases reach it
- **the tree carries the reach order.** every case passes through the roots; only some reach a given leaf. so "reach for roots first" reads off the metaphor with no gloss
- **the rival pairs overload or blur:**
  - `core` / `situational` — `core` collides with a core module and a cpu core; `situational` names no position, only a mood
  - `core` / `edge` — `edge` collides with an edge case and edge compute
  - `primary` / `secondary` — `primary` collides with a primary key and a primary replica
  - `essential` / `optional` — `optional` reads as skippable, and a leaf is not skippable where its case holds
- **the pair is symmetric**: four letters each, one metaphor (`rule.prefer.symmetric-term-pairs`, architect)

## .how

each tier names what earns it:

| tier | the member must name |
|---|---|
| root | the common case that breaks without it |
| leaf | the one kind of repo or load where it earns its cost |

## .examples

### 👍 good

| pattern | tier | why |
|---|---|---|
| `one-storage-transaction` | root | any write of more than one row breaks without it |
| `pessimistic-lock` | leaf | earns its cost only on a hot read-modify-write |

### 👎 bad

| pattern | tier |
|---|---|
| `one-storage-transaction` | core |
| `pessimistic-lock` | situational |

`core` overloads; `situational` names no position.

## .scope

tiers in catalogs, rule sets, toolkits, and boot plans — anywhere members sort by how widely they apply.

does not rename a tree's own nodes: a directory root, a dom root, a leaf operation (`define.domain-operation-grains`). those use the same metaphor — an outer tip, a base all paths pass through — for their own tree.

## .enforcement

- core/situational, core/edge, primary/secondary, or essential/optional where root/leaf fits = **nitpick**
- a tier with no named case that earns it = **nitpick**

## .etymology

- **root**, old norse *rót*: the part of a plant every branch grows from and draws through. a root member is one every case passes through
- **leaf**, old english *lēaf*: the outer tip of a branch. a leaf member sits at the tip one branch reaches

## .evidence

### the dimensional walk

| axis | values |
|---|---|
| does the pair name a position, not a grade? | yes (root/leaf) · no (essential/optional, primary/secondary) |
| does a term collide with an extant sense in our repos? | no (root/leaf, in the tier sense) · yes (core: module, cpu; edge: edge case; primary: key, replica) |
| does the metaphor carry the reach order? | yes (root/leaf: every path passes the root) · no (core/situational) |
| symmetric shape and length? | yes, 4 / 4 (root/leaf) · no (core/situational 4/11; essential/optional 9/8) |

the only candidate with the clean value on every axis: **root / leaf**.

### precedent

- a tree's root and its leaves — every path from the root reaches some leaf; no leaf is reached by every path
- `define.domain-operation-grains` already calls the operations that do the work at the tips **leaf operations**

## .rejected alternatives

| pair | why rejected |
|---|---|
| core / situational | `core` overloads; `situational` names no position |
| core / leaf | mixes two metaphors |
| core / edge | `edge` overloads with edge case and edge compute |
| primary / secondary | `primary` overloads with primary key and replica |
| essential / optional | reads as a grade; `optional` reads as skippable |
| common / rare | names frequency of a case, not position in the set |

## .see also

- `rule.require.ubiqlang` — one canonical word per concept
- `rule.prefer.symmetric-term-pairs` (architect) — the shape this pair holds
- `rule.prefer.converge-contrast` — a peer term pair
