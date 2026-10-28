# F27 — extant renders and test gaps outside the wish stay as found; each is dreamed

- **raised by:** 5.3 peer i002 — `ergo-contract-snapshots` blocker.1, `ergo-acceptance-journey-coverage`
  blocker.1 and blocker.2, `ergo-snapshot-visual-blemishes` blocker.1, blocker.3, nitpicks 1-7, 9,
  10, 12, 13, `mech-external-contracts` blocker.1, `mech-test-scope-purity` blocker.2
- **fork:** fix each here · fix what is the grove's and safe-and-clean, dream the rest
- **the line:** a point is in scope when the grove made it (a grove line, the grove help, a grove
  test) or when its fix is cheap and lands in a hunk this branch already holds. a point on a render,
  assert, or contract that `origin/main` already has, whose fix ripples across a suite, is out
- **out, by evidence:**
  - base suite failure renders (`git.repo.test.integration…snap`): the orphan `│  └─ ✋ failed`
    tree, the `lets ride` header on a timeout, `status` twice, the raw `npm ERR!` line, tip case,
    `defects` vs `error`, the `usage:` set vs `valid values:`, quote styles. `git diff origin/main`
    on that snap holds six `+ grove: bypass` lines and no other change. the orphan tree is the
    stderr tee of the tail only — the extant defect already caught as
    `.dream/v2026_10_28.fix.git-repo-test-headless-stderr-tree.md`
  - base suite: success cases snap stdout, failure cases snap stderr, each under an `output` title.
    both streams are asserted (`stderr is empty on success`, `stdout has progressive output`);
    only the snapshot covers one. a split adds ~17 snapshots in a suite the grove touched for six
    lines. the one case that snapped both under one title (`[case19]`) is split here
  - against-suite headers that drop `--what acceptance` (`[case5]`, `[case7]`, `[case8]`): the
    skill echoes the flags its refusal is about, on `origin/main`
  - set.package: the fake `npm install` / `pnpm add` / `npm view` and the absent acceptance test and
    snapshots are on `origin/main`. this branch changed that suite only to pin an owned package in
    the success case (F11), which made its audit call more real, not less. the fakes now carry
    `.mock` / `.why` / `.real` (the audit reaches the live registry)
  - guardBorder acceptance (5.3 peer i003): the injection files' absent snapshots and control case,
    the `console.log` debug lines, the SSRF stdout pins, and a guardBorder row in an experience
    catalog. `git diff origin/main` on those four files is F21's deflake alone — the dir setup moved
    into `useBeforeAll` — and no assert, log, or case changed. guardBorder is not the grove; this
    route's catalog walks the grove only. dream: `fix.guard-border-acceptance-snapshots`
- **in, fixed here:** `env:` help children nest under their label; the `name://` help line names
  `--mode apply`; base `[case19]` snaps stdout and stderr under their own titles
- **grove, kept:** plan mode prints no grove line. a plan run starts no suite, so there is no load
  to bound or name; a bypass line would add a line to every preview to say naught happened
- **dreams:** `fix.git-repo-test-headless-stderr-tree` (extant),
  `fix.git-repo-test-base-suite-stream-snapshots`, `fix.set-package-install-real-registry-case`
- **rework:** clean for each — they are independent and none blocks the grove
- **confidence:** 75% — a reviewer may read "the file is in the diff" as "the file is in scope"
- **verdict:** —
