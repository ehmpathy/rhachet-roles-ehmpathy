# F17 — "guardian" names what asserts a constraint is not broken

## .the fork

F03 ruled `enforcer` for what holds an invariant, and a peer brief used `detector` for what catches an assumption's break. once the inventory split into three peers (F15), one word had to cover all three. the options:

- **a.** `guardian` — what keeps watch over a constraint
- **b.** `asserter` — what asserts a constraint holds
- **c.** keep `enforcer` for invariants and guarantees, `detector` for assumptions
- **d.** `guard`

## .taken, and why at the time

**a.** the wisher proposed `asserter` for the symmetry across the three constraints, then `guardian` as the more generic: *"the guards of them"* (seeds: `inventory.of=seeds.for=declarations-and-guardians.md`). c splits one role in two by constraint kind, though a reconcile job guards an invariant and an assumption alike. b reads as a code construct. d is the antipattern (a guard in one caller).

the kinds ruled with it: **structural** (by compilation · by abstraction) and **operational** (proactive at test time · reactive at runtime · reactive by monitor). "proof", F03's second kind, became the test-time flavor.

## .rework

**clean.** a term sweep across `src/` and the route (done 2026-11-23); `domain.terms/guardian.md` written, `enforcer.md` retired. the surf-school examples moved "guardian" (a minor's signer) to "parent", so the word carries one sense.

## .confidence

— (ruled)

## .where

- `define.invariant` (both twins, and their `.min`) · `.template=guardian` · `philosophy.constraints-shrink-the-space` · `rule.require.assumptions-with-evidence`
- `.agent/repo=.this/role=any/briefs/domain.terms/guardian.md`
- I01, I04, I24, I25; cases 1, 2, 7

## .verdict

**guardian — ruled by the wisher (chat, 2026-11-23)**, with the kinds above. supersedes F03's `enforcer`.

**superseded by enforcement (F20, 2026-11-23).** the kinds stand; only the word changed. this record keeps the guardian-era paths as they were.
