# rule.avoid.unitemized-constraints

## .what

avoid a constraint declared somewhere other than its inventory: in a code comment, a jsdoc, a test name, a readme, or a pr description.

it is declared — so not implicit (`rule.forbid.implicit-invariants`, `rule.forbid.implicit-assumptions`) — but it is not **itemized**: no entry, no id, no one place to find it.

## .why

- **no home** — a reader cannot list the system's constraints; each one hides wherever its author happened to type it
- **no citation** — a test or guard cannot cite a comment by id, so `rhx grepsafe --pattern 'i001'` finds naught
- **drift** — two comments declare one constraint two ways, and neither is the source
- **decay** — a comment dies with its code; an entry outlives every rewrite

## .the smell

```ts
// note: a guarantee to consumers — reservation ids never change once issued
// invariant: one board per surfer per slot
```

- "invariant:", "assumption:", or "guarantee:" in a comment, with no id
- a constraint declared in a pr description that no entry carries
- a test named for a domain rule, with no `[i00n]` / `[a00n]` / `[g00n]`

## .the cure

itemize it: one entry per constraint in its inventory (`howto.itemize-constraints._`), then cite the id where the comment was.

```ts
// enforces [i002] — one board per surfer per slot
```

## .enforcement

- a constraint declared outside its inventory = **nitpick**

## .see also

- `catalog.of=tactic.constraint.kind=_.grain=declaration.tactic=itemize` — the member, in full
- `rule.prefer.itemized-constraints` — the prefer twin: one entry, one id, cited at each enforcement and test
- `howto.itemize-constraints._` — where and how to itemize
- `rule.forbid.implicit-invariants` · `rule.forbid.implicit-assumptions` — the blockers: a constraint declared nowhere
