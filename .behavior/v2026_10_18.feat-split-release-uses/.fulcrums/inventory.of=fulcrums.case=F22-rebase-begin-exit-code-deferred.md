# F22 — the rebase begin exit-code split covers this stone's arms; the rest is deferred

## .the fork

`rule.require.exit-code-semantics` says a caller-must-fix refusal exits 2 and a damaged-state
refusal exits 1. `git.branch.rebase.begin.sh` predates the rule: every refusal exits 1 behind an
`error:` header.

- **A** — leave every arm at exit 1; catch a dream for the whole split
- **B (taken)** — the arms this stone writes or rewrites follow the rule; the arms it does not
  touch keep exit 1 and ride the dream
- **C** — split every begin refusal now

## .taken, and why

B. the peer review (mech-failhides, i001) named the stone's own arms. a new refusal that ships
against the rule is a fresh defect, not a legacy one. the untouched arms predate the stone and
their asserts span three suites, so C is safe but not clean.

| arm | exit | header |
|---|---|---|
| remote branch holds commits the tree lacks (F7) | 2 | ✋ ConstraintError |
| no commit grant on this tree | 2 | ✋ ConstraintError |
| no commit uses left | 2 | ✋ ConstraintError |
| the local quota file is damaged | 1 | 💥 MalfunctionError |
| origin/<branch> cannot be read (F7 probe) | 1 | 💥 MalfunctionError |
| on main · dirty tree · rebase in progress · fetch of main failed | 1 | `error:` (untouched; the dream) |

## .rework

clean for the arms above. dirty in reach for the rest: the untouched arms plus the begin, rebase,
and journey suites.

## .confidence — 80%

the rule is clear. the call is only where the line sits between this stone and the dream.

## .where

dream: `.dream/2026_10_21.rebase-begin-exit-code-semantics.dream.md` (linked from `dreams/`)

## .verdict

open.
