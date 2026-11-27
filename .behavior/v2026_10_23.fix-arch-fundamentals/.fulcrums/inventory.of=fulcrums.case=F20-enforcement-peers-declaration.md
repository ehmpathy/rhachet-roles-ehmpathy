# F20 — "enforcement" names what asserts a constraint is not broken

## .the fork

F17 ruled `guardian`. the wisher flagged it as slightly off: declaration and its counterpart are grains, and an agent noun does not pair with one. the options:

- **a.** `enforcement` — the act and its mechanism; the peer grain of `declaration`
- **b.** keep `guardian`
- **c.** `enforcer` (F03's pick)

## .taken, and why at the time

**a.** the wisher: declaration and enforcement are better peers, and enforcement applies to all three constraints (seeds: `inventory.of=seeds.for=declarations-and-guardians.md`, `.enforcement supersedes guardian`). each constraint gets its own enforcement:

| constraint | to enforce it |
|---|---|
| invariant | keep it true: refuse the break |
| assumption | assert we are not mistaken: detect the break and fail fast |
| guarantee | prove it to consumers before each release: a blackbox acceptance test |

the second row retires a claim the briefs made before: "we cannot enforce an assumption". we cannot make the world keep it, but an assertion that fails fast is its enforcement.

b is an agent noun and collides with a minor's legal guardian. c is an agent noun too, and reads as structural force alone.

## .rework

**clean.** a term sweep across `src/` and the route (done 2026-11-23): `.template=enforcement`, `.enforcement=$slug` zoom-ins, "which constraint, and how is it enforced?", and the per-constraint table in `define.invariant`. `domain.terms/enforcement.md` written; `guardian.md` retired. the one cost: "enforcement" also titles the grade section of every rule brief; context separates the two senses (yield, `.what is awkward`).

## .confidence

— (ruled)

## .where

- `define.invariant` (both twins, and their `.min`) · `.template=enforcement` · `rule.require.assumptions-with-evidence` · `rule.forbid.unstated-assumptions` · `ref.invariant.history` · `philosophy.constraints-shrink-the-space`
- `.agent/repo=.this/role=any/briefs/domain.terms/enforcement.md`
- I01, I04 (`define.enforcement`), I24, I25, I27; cases 1, 2, 7

## .verdict

**enforcement — ruled by the wisher (chat, 2026-11-23)**: *"and yes, sweep the enforcement change too"*. the structural and operational kinds from F17 stand. supersedes F17's `guardian`.
