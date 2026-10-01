# F9 · what happens on a box with no `rg` at all?

- **rework**: clean — a swapped default and an error text
- **status**: ✅ ruled 2026-09-11 — option A, failfast. my option B overruled
- **confidence**: 65% → ruled

## .the fork

F8 removes the divergence. it does not say what stands where `rg` cannot be found.

| # | option | what a caller with no `rg` sees |
|---|--------|--------------------------------|
| **A (ruled)** | hard-fail; `rg` is a hard dependency | an error that names the fix; the tool does not run |
| B (my call) | keep the fallback, make it equivalent | correct results, `engine: grep` |
| C | vendor `rg` | it always works; grepsafe ships a binary |

## .my call, and why it lost

B argued the divergence was the defect, not the fallback's existence, and that A converts a wrong
answer into no answer.

B weighed divergence and never weighed duplication. an equivalent fallback is a second path to the
same answer — a synonymous codepath (`rule.require.fewer-paths-via-idempotency`).

## .the verdict

the wisher: *"failfast if rg is absent"* and *"zero synonymous codepaths."*

- **failfast.** with no `rg`, grepsafe exits non-zero with an error that names the fix, never a `0`
  that reads as a clean search. a named refusal is legible where a false `0` is not, so the harm is
  averted, not moved.
- **zero synonymous codepaths.** the `grep` arm is deleted, not made equivalent.

consequences:

- axis D2 (engine) collapses to one value, `rg`
- F2 is moot
- the `grep -r` symlink-descent question is deleted with the arm

## .where

- `case=5` — the divergence table
- `src/domain.roles/mechanic/skills/claude.tools/grepsafe.sh` — the `rg`-absent refusal
