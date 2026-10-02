# F6 · fix the hidden-path defect in this round, or file it?

- **rework**: clean (code) · dirty (round)
- **status**: ✅ ruled 2026-09-03 — option A, fix it here
- **confidence**: 60% → ruled

## .the fork

self-review found a second, independent defect (case=8): `rg` skips hidden paths by default, so
grepsafe cannot see inside `.agent/`, `.behavior/`, `.github/`, or any dot-directory — with no glob
involved.

| option | consequence |
|--------|-------------|
| **A (ruled)** | acceptance 1 becomes true for the wish's own example; the round widens |
| B | file it separately; the round ships green while its headline command still returns 0 |
| C | fix it with fallback parity — folded into A |

## .taken, and why

**A.** acceptance 1 is unreachable without it. the wish's example `.agent/**/*.md` returned a false
zero under both engines, by two mechanisms:

| engine | cause | closed by |
|--------|-------|-----------|
| `rg` | `.agent` skipped on descent | this fix |
| `grep` | `--include` matched the basename | the original repair |

the counter-argument: the wish says *"do not widen `grepsafe`'s surface"*, and this is a distinct
defect.

## .confidence — 60%

- a scope decision belongs to the wisher
- the wish's "do not widen" clause is explicit and repeated
- the remedy's blast radius (`--hidden` exposes `.git/`) was unmeasured

## .the verdict

the wisher:

> *"two defects behind one acceptance criterion are one deliverable. a change that cures one and
> ships leaves the reported symptom intact and closes the issue — which is worse than shipping
> naught, because it **retires the report without curing the report**."*

> *"the headline command must return real results when the work is done, by whatever set of causes
> stands between it and that."*

acceptance 1 is outcome-scoped, not mechanism-scoped. to cure the reported symptom widens no surface,
however many causes sit behind it.

## .what the verdict unlocked

a portable repro of the headline (`.agent` is tracked and not gitignored, so the zero is purely the
hidden skip):

| call | result |
|------|--------|
| `--pattern 'repo structure: rhachet-roles-ehmpathy' --glob '.agent/**/*.md'` | `matches: 0` — false |
| `--pattern 'repo structure: rhachet-roles-ehmpathy' --path .agent` | 1 real file |

and the mechanism, narrowed to **descent**:

| probe | result |
|-------|--------|
| `--pattern 'the fulcrum council'` (path `.`) | 0 — `.fulcrums` skipped on descent |
| `--pattern 'the fulcrum council' --path .fulcrums` | 6 files |
| same pair for `.behavior` | 0 / 4 files |

rule: an explicit root is searched, hidden or not; a hidden entry met on the walk is skipped. the
repair belongs at the walk. the path handler was never broken.

side result: `.reviews/peer/.gitignore` holds `*`, so grepsafe's default walk cannot see peer-review
artifacts — a separate witness of the gitignore divergence.

the fix must keep `.git/` internals excluded — case=8 `[t3]` measures it.

## .where

- `1.vision.experience.case=8.hidden-paths-unsearchable.md`
- `1.vision.experience.case=3.rg-slashed-glob-holds.md`
- `1.vision.experience.case=5.engine-provenance.md`
