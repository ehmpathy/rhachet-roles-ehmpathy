# F13 — i007 nitpicks held

## the fork

three `[nitpick][better]` points from i007 could each be done here, or held:

| point | lane | do it | hold it |
|---|---|---|---|
| say cues cite `rule.require.shapefit` and `rule.require.errors-name-the-fix`, which a 101 seat cannot reach | r10.6 | add a ref row per cite | the cue names the cite; the seat reads it via `rhx` |
| no path-only snapshot of the slice boot | r10.8 | boot the slice spec, snap say paths + ref roster | the `--subject 101` boot test checks every say row emits; F11 scopes case 1 |
| `cap` (test) vs `budget` (rhachet) for one concept | r11.6 | rename `SUBJECT_BUDGETS` / `cap.*` to one word | keep: the test's `cap` is a stand-in that is not a rhachet `budget:` until rhachet accepts one |

## taken

hold all three.

- r10.6: each ref row hits rhachet's roster defect (F7) and grows the full role ~37 tokens, which wish item 5 forbids. `errors-name-the-fix` lives in role=ergonomist, which no mechanic ref row can reach.
- r10.8: the `--subject 101` boot test proves each say row emits; a snapshot of paths adds a second pin of the same rows the exact-pin test holds. F9 already defers render snapshots.
- r11.6: two words mark two homes. once rhachet takes a section `budget:`, the test row goes away and one word remains (the boot.yml header names the move).

## rework

clean — each is an additive test, a rename, or a ref row; no caller hardens on the held shape.

## confidence — 80%, and why it is low

r10.8 is the weakest hold: a path-only snapshot is cheap and would show a reviewer what a director sees. a council that wants it gets it in one test.

## where

`src/domain.roles/boot.budget.integration.test.ts`, `src/domain.roles/mechanic/boot.yml`,
`src/domain.roles/mechanic/boot.yml.integration.test.ts`

## verdict

open for r10.6 and r11.6. r10.8 built at 5.3: `boot.budget.integration.test.ts` `[t1]` boots the
slice spec and snaps the paths a seat sees (proven red with a `.md.min` row, green restored).
