# rule.forbid.implicit-invariants

## .what

never let correctness rest on a domain invariant that no inventory entry declares.

an **invariant** = what holds in every scenario a reader can observe, kept by us (`define.constraint.kind=invariant`). implicit, it lives only in one author's head, one guard, or one test — and the next writer, human or robot, cannot see it to keep it.

## .the smell

- a guard that protects a domain rule, with no entry it cites
- a test that asserts a domain rule, with no `[i00n]` in its name
- a comment such as "this must never exceed stock" or "a surfer can only book once"
- a review question "why can this never go negative?" that no one answers with an entry

```ts
// 👎 the rule "reserved ≤ stock" lives only in this line — the voucher path never learns it
if (slot.reserved >= slot.stock) throw new ConstraintError('slot full');
```

## .the cure

walk `rule.require.invariant-before-operation`, in order:

1. **declare it** — one entry in `inventory.of=invariant`: the statement, its baseline and boundary cases, in domain words (`howto.itemize-constraints._`)
2. **name each break path** — a race, a retry, a second write path, a bad input, a partial failure
3. **enforce each path, structural first** — a type, a domain object that refuses construction, one write path, a storage constraint, an optimistic lock (`define.constraint.grain=enforcement`)
4. **prove each break case** — a test that cites the id (`given('[i001] two surfers race for the last board', …)`), red without its enforcement

the entry stays declarative: it never names the enforcement.

## .enforcement

- an operation that writes, whose correctness rests on an undeclared invariant = **blocker**
- a test or guard that holds a domain rule with no entry to cite = **blocker**

## .see also

- `catalog.of=tactic.constraint.kind=invariant.grain=declaration.tactic=declare` — the member, in full
- `rule.require.invariant-before-operation` — the require twin, in full
- `rule.forbid.implicit-assumptions` — the peer: the condition the world keeps
- `rule.forbid.scattered-invariant-guards` — where an implicit invariant usually hides
- `philosophy.invariants-are-the-source` — why the declaration is the source
