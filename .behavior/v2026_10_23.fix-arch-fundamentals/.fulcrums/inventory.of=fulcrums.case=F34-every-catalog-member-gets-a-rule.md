# F34 — every catalog member gets its own rule file

## .the fork

a reviewer loads only `rule.*` files, never a catalog member. so a member's verdict reaches review only if a rule carries it. the choice: a rule per member (the superset), or a rule per forbid pole only, with the catalog member as the require detail.

## .taken, and why

the superset, on the wisher's word: "reviewers only pull in rule files (even the ones not said) so its improtant we get the superset as rules".

- events: 10 require rules; 2 new forbids for the `owner` and `time` cells the walk left empty (`rule.forbid.shared-writers`, `rule.forbid.single-time-points`)
- transactions: 18 require rules; `two-phase-commit` and `distributed-lock` split out of `rule.forbid.sagas` into their own forbids
- abstractions: one rule per pole no extant rule owns — 7 require, 7 forbid; the poles of `barrier`, `decorate`, `idempotent`, and the `gather` forbid stay with their extant owners
- constraints: `rule.prefer.itemized-constraints`, the twin of `rule.avoid.unitemized-constraints`

boot: every new require sits under a `not:` glob per dir (a reviewer loads it regardless; a clone reaches it from the catalog root). every new forbid and the prefer twin boot as `ref`. architect: src 14,368, linked 14,566 of 15,000; no cap rose.

## .rework

clean. each name is one file plus its cites; a rename is one replace.

## .confidence — 75%, and why it is low

the shape is ruled; the names are best guesses:

| name | confidence | the doubt |
|---|---|---|
| `rule.require.one-home-per-decision` | 75% | parnas's own name, "information hiding", is a gerund the hook blocks |
| `rule.require.hatches-via-safe-primitives` | 70% | "hatch" may read as jargon |
| `rule.forbid.illegal-values-constructible` | 80% | awkward; the natural phrase uses a banned word |
| `rule.forbid.single-time-points` | 75% | also covers a time whose name says not which; alt `ambiguous-time-points` |
| `rule.forbid.shared-writers` | 80% | alt `multiple-writers-per-resource` |
| the two event forbids with no member file | 80% | alt: a forbid member per cell |
| plural slugs where the pattern is countable (`async-tasks`, `version-checks`) | 80% | singular kept where the slug names one move (`transactional-outbox`) |
| sub-grades the catalogs never stated (a row lock across an external call = blocker; a status with no declared edges = nitpick) | 80% | each names its harm, but the wisher never ruled them |

and one tier call: 97% of the linked boot is spent, so the next say brief needs a condense first.

## .where

`domain.events/rule.*` · `domain.transactions/rule.*` · `domain.abstractions/rule.*` · `domain.constraints/rule.prefer.itemized-constraints.md` · `architect/boot.yml`

## .verdict

ruled by the wisher, 2026-11-26:

- `rule.require.safe-escape-primitives`; "hatch" swept to "escape" across the abstraction briefs, so the rule and its member say one word
- `rule.forbid.illegal-values-constructible` kept
- `rule.forbid.ambiguous-time-points`
- `rule.forbid.multiple-writers-per-resource`
- plural slugs kept
- sub-grades: blockers, but for one. a status with no declared edges stays a nitpick, after a skeptic pass the wisher asked for: its harm already grades blocker twice — an unguarded status write (`rule.require.guarded-status-transitions`) and a guard with no entry to cite (`rule.forbid.implicit-invariants`) — so a third blocker double-counts, and bites a two-value status with no forbidden edge

one pick stays open: the wisher named `rule.require.hidden-decisions` and asked why not `absorbed-decisions`. "hidden" and "absorbed" are one concept, and `absorb` already names ousterhout's tactic, so the separate rule names the cut instead: `rule.require.decision-decomposition`, the symmetric twin of `rule.forbid.temporal-decomposition`. "choice" swept to "decision" across the abstraction briefs, one word for the concept. ruled good by the wisher, 2026-11-26
