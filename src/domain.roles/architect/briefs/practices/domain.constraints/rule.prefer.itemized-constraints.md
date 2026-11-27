# rule.prefer.itemized-constraints

## .what

prefer one inventory entry per constraint, with an id, and cite that id wherever the constraint is enforced or tested.

an itemized constraint has one home: the entry declares it, in domain words; each enforcement and each test points back at it by id.

## .why

- **one list** — a reader can enumerate every constraint the system keeps, in one place
- **one citation** — a guard, a test, or a review can name the constraint by id (`[i002]`), and a search for the id finds every path that keeps it
- **one source** — when the code and the entry disagree, the entry settles which side is wrong
- **one life** — an entry outlives the code that enforces it; a rewrite re-cites the id, never re-derives the rule

## .how

1. declare it in its inventory: `inventory.of=invariant`, `inventory.of=assumption`, or `inventory.of=guarantee` (`howto.itemize-constraints._`)
2. give it the next id of its kind: `[i00n]` · `[a00n]` · `[g00n]`
3. cite the id at each enforcement and each test that proves it

```ts
// enforces [i002] — one board per surfer per lesson slot
then('[i002] a second board for kai in the 6am slot is refused', async () => { ... });
```

## .enforcement

- a constraint enforced or tested with no entry to cite = **nitpick**
- an enforcement or test of an itemized constraint that omits its id = **nitpick**

## .see also

- `catalog.of=tactic.constraint.kind=_.grain=declaration.tactic=itemize` — the member, in full
- `rule.avoid.unitemized-constraints` — the avoid twin: a constraint declared in a comment, a test name, or a pr description
- `howto.itemize-constraints._` — the inventory shape and its templates
- `rule.forbid.implicit-invariants` · `rule.forbid.implicit-assumptions` — the blockers: a constraint declared nowhere
