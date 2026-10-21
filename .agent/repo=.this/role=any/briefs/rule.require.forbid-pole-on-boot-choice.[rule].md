# rule.require.forbid-pole-on-boot-choice

## .what

when a boot budget forces a choice between the two poles of a rule pair — a `forbid` and its
`require` twin, or an `avoid` and its `prefer` twin, that govern one behavior — the **forbid pole**
boots as `say`. the other pole boots as `ref`.

the `say` forbid brief must carry the cure: the shapes, operations, or pattern to reach for
instead. a ban with no cure leaves the clone stopped; a ban with its cure guides it.

## .why

- **the forbid bites** — it names a concrete violation, so the clone recognizes the smell at the
  keyboard and a reviewer can point at the line. a require names a target, which is easy to drift
  past without notice
- **the forbid is the blocker** — `forbid` grades at blocker; the cost of a miss is highest there
- **the forbid already holds the cure** — a well-written forbid lists what to reach for; the
  require twin's extra depth is detail, safe to read on demand

## .how

1. find the pair: two briefs that govern one behavior from opposite poles
2. boot the forbid pole as `say` — condense it to a `.min` twin if the budget is tight
3. confirm the `say` brief names the cure (the types, ops, or pattern); add them if absent
4. boot the require pole as `ref`; cite it from the forbid brief as the full detail

a pair is not a choice when the budget holds both — then both boot as `say`.

## .examples

| behavior | say (forbid pole, with the cure) | ref (require pole) |
|---|---|---|
| time values | `rule.forbid.any-time` (names `IsoTimeStamp`, `asIsoTimeStamp`, `addDuration`) | `rule.require.iso-time` |
| money values | `rule.forbid.any-price` (names `IsoPriceWords`, `priceSum`, `priceMultiply`) | `rule.require.iso-price` |
| inline logic | `rule.forbid.inline-decode-friction` (names the extract to `as*`, `is*`, `compute*`) | `rule.require.named-transformers` |
| repeat test calls | `rule.forbid.redundant-expensive-operations` (shows the `useThen` cure) | `rule.require.useThen-useWhen-for-shared-results` |
| type casts | `rule.forbid.as-cast` | `rule.require.assure-via-type-checks` |

## .enforcement

- the require pole booted as `say` while its forbid twin sits in `ref` = **blocker**
- a forbid pole booted as `say` that does not name the cure = **nitpick**

## .see also

- `howto.check-role-costs.[lesson].md` — measure a boot before and after a choice
- `src/domain.roles/boot.budget.integration.test.ts` — the per-role budget clamp
