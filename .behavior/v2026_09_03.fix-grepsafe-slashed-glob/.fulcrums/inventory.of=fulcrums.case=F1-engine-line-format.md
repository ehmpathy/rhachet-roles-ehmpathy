# F1 · the `engine:` line is a tree branch, not a footer

- **rework**: clean — a one-line move within a print block
- **status**: open, best-guessed
- **confidence**: 85%

## .the fork

acceptance 4 demands the answer name its engine. the wish leaves the format open: *"the trait is 'an
answer carries which engine produced it'; the format is yours."*

| option | shape |
|--------|-------|
| **A (taken)** | a tree branch beside `pattern`/`path`/`glob`: `├─ engine: rg` |
| B | a footer line after the results |
| C | only on a zero |
| D | only under `--verbose` |

## .taken, and why

**A.** the engine is context about the question asked, like `pattern`, `path`, and `glob`, so it sits
with them (`rule.require.treestruct-output`).

- C marks a zero as an anomaly and denies provenance to a wrong non-zero answer.
- D is provenance no one has: a flag no one passes fails the discoverability test that let this defect
  survive.

since F9 deleted the `grep` arm, the line reads `engine: rg` on every answer. its role is provenance
for the one engine, still owed by acceptance 4 — no longer a diagnostic between two.

## .confidence — 85%

the 15%: `--output pipeable`. pipeable stdout is data and stays clean, so it carries no engine line. a
reviewer who wants provenance there reopens the shape.

## .where

- `1.vision.experience.case=5.engine-provenance.md`
- `src/domain.roles/mechanic/skills/claude.tools/grepsafe.sh` — the print blocks

## .verdict

_open — awaits the fulcrum council._
