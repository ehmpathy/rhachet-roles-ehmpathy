# F21 — four suite failures outside the wish are repaired in this PR

- **found:** 5.3 verification. the full local acceptance and `--thorough` integration runs failed
  in four files this branch never touched; each passes alone on an idle box
- **fork:** repair them here (the stone: "every failure is your responsibility now") · leave them
  to a follow-up PR, recorded as known flakes
- **taken:** repair here, each at its cause, each with proof:

| file | cause | repair | proof |
|---|---|---|---|
| `blackbox/guardBorder.onWebfetch*.acceptance.test.ts` (4 files, 20 sites) | `npx rhachet roles link` (~40s) inside the timed `useThen`, which shares a 90s budget with the hook | link moved into `useBeforeAll` | `[case2]` 90019 ms (fail) → 6190 ms in a full run; acceptance 257/257 |
| `permission-gates.parity.integration.test.ts` | not hermetic: hooks read the runner's `$CLAUDE_CONFIG_DIR` and `$HOME/.claude`, not the temp repo's allowlist | `CLAUDE_CONFIG_DIR` unset, `HOME` pinned | red in the full run under this clone's config dir; 5/5 after |
| `_hardnudge.lib.sh` + its suite | a waiter gave up its stamp after ~2s on a LIVE holder; a loaded box serializes writers past that | wait ~6s (under the 10s hook timeout); clamp `[case3]` | clamp red on both hooks at 2s, green at 6s |
| `pressViaPipeline.integration.test.ts` | remote brain calls ~5x slower in a full run (18.7s idle → 54.5s, two past 90s) | file budget 240s | the full integration rerun, once it exits |

- **left out, dreamed:** the hardnudge takeover-by-elapsed-time path (lock protocol change); the
  slow check-permissions hook paths (perf diagnosis)
- **rework:** clean — each repair is local to its file and reverts alone
- **confidence:** 80% — the stone mandates the repair; the director may prefer a separate PR for
  changes outside the wish
- **raised by:** self review 3/8, 5.3
- **verdict:** ✅ director, 2026-10-27 — keep all four in this PR; each fixed a red or flake that
  blocked this PR's own green under load. name all four in the PR body
