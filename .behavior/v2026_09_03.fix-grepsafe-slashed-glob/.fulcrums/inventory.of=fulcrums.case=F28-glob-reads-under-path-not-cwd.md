# F28 — a glob under `--path` reads from `--path`, never from cwd

## .the fork

`--path src --glob 'src/nested/**/*.sh'` found `src/nested/deep/x.sh`. case33[t2] pinned that.

it matched only because rg read the glob from its cwd, the repo root. that same cwd read makes
D1 (`docs/*.md` reaches `docs/sub/`) and D2 (`p/*/a.md` finds naught). one mechanism, three
symptoms.

- **A** — run each leg from its root. the glob reads under `--path`, as case34 and `--help`
  state. case33[t2] flips to an honest `no file matched the glob`.
- **B** — keep the cwd read for a `--path` search. D1 and D2 stay open under `--path`.

## .taken — A, and why

- case34 already pins "`--glob` anchors to the search root, never to cwd". case33[t2] contradicts it.
- B keeps a false zero alive. that is the defect the wish exists to kill.
- case33[t2]'s real claim holds: no false `unread` block. that assertion stays.

## .rework — clean

one test asserts one boolean. B restores it with a cwd switch for `--path` legs.

## .confidence — 88%, and why not higher

a caller who typed the path twice (`--path src --glob 'src/…'`) now gets a zero where they got a
hit. the zero is honest and names the glob, but it is a behavior change a caller may meet.

## .where

- `grepsafe.sh` — `add_search_leg` (`LEG_CWDS`), the leg loop
- `grepsafe.integration.test.ts` — case33[t2], case41

## .verdict

open.
