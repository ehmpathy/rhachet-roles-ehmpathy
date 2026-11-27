# rule.forbid.misplaced-operations

## .what

never place an operation anywhere but the common ancestor of the domains that use it. two smells, one defect:

- **lifted too high** — an operation sits above its users: a flat `src/logic/` of task-specific operations, or a lift with no second user
- **left too low** — an operation sits below a second user: a peer domain imports it from another peer's leaf, or keeps its own copy

## .why

- **too high hides what belongs where** — a flat namespace of sixty operations shows no one what belongs to draft vs adjust vs charge
- **too high is a speculative lift** — a lift with no second user guesses at reuse and widens the operation's audience for no proven need
- **too low couples peers** — a sideways import from `draft/` into `adjust/` makes `adjust` depend on `draft`'s internals; a change to draft breaks adjust
- **too low forks the truth** — a copy per peer drifts; two answers to one question

## .the smell

- a top-level `logic/` or `utils/` dir of task-specific operations with no domain noun
- an operation lifted to a parent with one user
- `import { asStripeInvoiceItem } from '../draft/asStripeInvoiceItem'` inside `adjust/` — a reach into a peer's leaf
- two near-identical operations in two peer dirs

## .the cure

place each operation at the common ancestor of its users (`rule.require.most-common-denominator`):

| users | place |
|---|---|
| one domain | its leaf dir |
| 2+ peer domains | their common ancestor — lift now, delete the copy, repoint each import |
| none left | delete it |

then ask what the reuse reveals: many shared operations → two domains may be one, falsely split · few → lift and move on · orthogonal → a cross-cut that may warrant its own domain.

## .examples

### 👎 bad — left too low

```
src/logic/advertise/invoice/lifecycle/
├── draft/
│   └── asStripeInvoiceItem.ts       # adjust/ imports it from here
└── adjust/
    └── adjustInvoiceItemPrice.ts    # import '../draft/asStripeInvoiceItem'
```

### 👍 good — lifted to the common ancestor

```
src/logic/advertise/invoice/lifecycle/
├── asStripeInvoiceItem.ts           # used by draft/ and adjust/
├── draft/
│   └── genInvoiceDraft.ts
└── adjust/
    └── adjustInvoiceItemPrice.ts
```

## .enforcement

- an operation placed above the common ancestor of its users (flat namespace, speculative lift) = **blocker**
- an operation imported from a peer's leaf, or copied into a second peer = **blocker**

## .see also

- `rule.require.most-common-denominator` — the require twin, with the full worked trees
- `rule.prefer.directory.subdomain-clusters` — the clusters an operation nests into
- `rule.prefer.wet-over-dry` — when to generalize, a different concern from where to place
