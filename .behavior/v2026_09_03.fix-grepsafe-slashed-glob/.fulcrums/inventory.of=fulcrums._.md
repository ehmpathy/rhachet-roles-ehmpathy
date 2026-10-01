# inventory.of=fulcrums — the summary

> route = `.behavior/v2026_09_03.fix-grepsafe-slashed-glob`
> forks best-guessed mid-drive, plus every call made under 93% confidence.

open calls first, lowest confidence first. then the settled.

## .open

| case | title | rework | status | confidence |
|------|-------|--------|--------|------------|
| [F27](./inventory.of=fulcrums.case=F27-path-readability-as-an-axis.md) | is path readability a ninth axis, or an itemization? | clean | open — best-guessed B (demo + itemize) | 62% |
| [F21](./inventory.of=fulcrums.case=F21-diagnose-zero-kind-three-grains.md) | `diagnose_zero_kind` holds three grains — split it? | clean | open — best-guessed keep whole | 68% |
| [F14](./inventory.of=fulcrums.case=F14-globsafe-comment-fix-forward.md) | a comment-only fix-forward in peer `globsafe.sh` | clean, both ways | open — best-guessed fix forward | 70% |
| [F12](./inventory.of=fulcrums.case=F12-rg-absent-exit-code.md) | an absent `rg` — exit 2 (constraint) or 1 (malfunction)? | clean | open — best-guessed exit 2 | 80% |
| [F29](./inventory.of=fulcrums.case=F29-stdin-socket-wait.md) | a socket on stdin waits 1s for a first byte, then the file search stands | clean | open — best-guessed A | 80% |
| [F19](./inventory.of=fulcrums.case=F19-output-section-else-branches.md) | flatten the output section's two `else` branches? | clean (code) · dirty (round) | open — best-guessed accept the shape | 80% |
| [F1](./inventory.of=fulcrums.case=F1-engine-line-format.md) | the `engine:` line is a tree branch, not a footer | clean | open — best-guessed A | 85% |
| [F28](./inventory.of=fulcrums.case=F28-glob-reads-under-path-not-cwd.md) | a glob under `--path` reads from `--path`, so `--path src --glob 'src/…'` now zeros | clean | open — best-guessed A (root-anchored, case33[t2] flipped) | 88% |
| [F24](./inventory.of=fulcrums.case=F24-one-refusal-at-a-time.md) | refusals report one failure at a time, in a fixed gate order | clean | open — best-guessed hold | 88% |
| [F5](./inventory.of=fulcrums.case=F5-suspicion-b-disproven.md) | the absolute-root suspicion is disproven — on one box | clean | open | 90% |

## .settled

| case | title | rework | status | confidence |
|------|-------|--------|--------|------------|
| [F16](./inventory.of=fulcrums.case=F16-globsafe-error-streams.md) | globsafe's ten refusals never reach stderr — fix the peer now? | clean (code) · dirty (round) | ✅ ruled by the wisher — fix it now, in the house frame | 78% → ruled |
| [F22](./inventory.of=fulcrums.case=F22-repo-boundary-two-producers-across-two-files.md) | the repo-boundary check has two producers across two files | clean (code) · dirty (round) | ✅ ruled — landed with F16 (`is_path_within_repo_root`) | 74% → ruled |
| [F17](./inventory.of=fulcrums.case=F17-unreachable-zero-kind.md) | one advertised zero-kind can never render — rank it, or delete it? | clean (code) · dirty (round) | 🔴 self-reversed — A: the measured skip outranks the probe | 70% → self-reversed |
| [F26](./inventory.of=fulcrums.case=F26-gh-contract-has-no-real-call.md) | `git.release` has no real authenticated `gh` call | clean | ✅ out of scope (wisher, 2026-09-27). creds-absent real-boundary test landed; shape drift is a dream | ruled |
| [F4](./inventory.of=fulcrums.case=F4-actor-as-a-dimension.md) | actor (robot vs human) — is it an axis? | clean, both ways | ✅ ruled 2026-09-08 — stays dropped. my call confirmed | 55% → ruled |
| [F6](./inventory.of=fulcrums.case=F6-hidden-path-scope.md) | fix the hidden-path defect here, or file it? | clean (code) · dirty (round) | ✅ ruled 2026-09-03 — A, fix it here | 60% → ruled |
| [F10](./inventory.of=fulcrums.case=F10-lines-label-deferred.md) | defer the `lines: N` mislabel? | clean | 🔴 self-reversed — fixed | 60% → self-reversed |
| [F23](./inventory.of=fulcrums.case=F23-rename-output-direct.md) | rename `--output direct` | clean (code) · dirty (round) | 🔴 ruled 2026-09-24 — `pipeable`. my deferral and `data` pick overruled | 62% → overruled |
| [F9](./inventory.of=fulcrums.case=F9-no-rg-on-the-box.md) | what happens with no `rg` at all? | clean | 🔴 ruled 2026-09-11 — A, failfast. my B overruled | 65% → overruled |
| [F13](./inventory.of=fulcrums.case=F13-search-root-two-producers.md) | the search root had two producers | clean (code) · dirty (round) | 🔴 self-reversed — the extraction landed, zero snapshot drift | 65% → self-reversed |
| [F3](./inventory.of=fulcrums.case=F3-bound-expansion-to-tracked.md) | bound the fallback expansion to tracked files | clean | 🔴 ruled 2026-09-04 — D. my A rejected | 70% → overruled |
| [F11](./inventory.of=fulcrums.case=F11-type-field-not-echoed.md) | echo `--type` as a labeled field? | clean | 🔴 self-reversed — taken | 70% → self-reversed |
| [F20](./inventory.of=fulcrums.case=F20-direct-mode-refusals-stderr-only.md) | pipeable-mode refusals write stderr only, against a blocker-graded rule | clean (code) · dirty (round) | ✅ ruled 2026-09-23 — A, the deviation stands. the rule text is unchanged | 72% → ruled |
| [F15](./inventory.of=fulcrums.case=F15-coconut-hints-on-refusals.md) | reshape refusal remedies as coconut hints? | clean (code) · dirty (round) | 🔴 self-reversed — the shape landed | 72% → self-reversed |
| [F18](./inventory.of=fulcrums.case=F18-acceptance-7-under-direct-mode.md) | does acceptance 7 bind the pipeable mode? | clean (code) · dirty (round) | ✅ ruled 2026-09-23 — no. my call confirmed | 74% → ruled |
| [F7](./inventory.of=fulcrums.case=F7-files-count-branch.md) | make the two honest zeros read apart | clean | ✅ ruled 2026-09-08 — yes. acceptance 7 adopted | 75% → ruled |
| [F2](./inventory.of=fulcrums.case=F2-reuse-globsafe-pavement.md) | reuse globsafe's expansion in the fallback | clean | 🌙 moot — F9 deleted the fallback | 80% → moot |
| [F25](./inventory.of=fulcrums.case=F25-git-release-clock-deferred.md) | `git.release` reds under host load — repair or defer? | clean | 🔴 self-reversed — three defects repaired, 33 → 0 reds, zero churn | 80% → self-reversed |
| [F8](./inventory.of=fulcrums.case=F8-why-two-engines-at-all.md) | why two engines at all? | clean (code) · dirty (round) | 🔴 ruled 2026-09-08 — fold it in. my call reversed | 85% → overruled |

every open call is a clean rework at the code scale; none blocks the drive
(`rule.always.defer-fulcrums-to-last`). read the `rework` column for each fulcrum's round grade.

## .the calibration

**scope calls read the bound too narrowly, every time.** F3, F8, and F9 were overruled by the wisher,
and F10, F11, F13, and F15 were self-reversed — all toward a wider read of what the wish permits. the
wish forbids a **redesign** and sanctions **one line of provenance**; the deferrals cited the first
clause without the second. a bias with a known sign is correctable without a council.

**confidence tracked defensibility, not odds.** F8 sat at 85% — higher than the two calls confirmed
beside it (F7 75%, F4 55%) — and was the one reversed. a fulcrum about scope cannot be priced by a
read of the scope document; only the wisher can say whether the bound is right.

**entries that carried their own refutation took the other option anyway.** F3, F8, F10, F11, and F25
each named the winner in their own confidence paragraph. when the minority names a rule and the
majority names only a scope read, the minority wins.

**a deferral is a decision about a cause.** F25 deferred on a cause never run; the measurement found
three defects and zero churn. run it before you price the repair.

**a fulcrum that never reaches a council is a silencer.** F13 held one correct diagnosis for five
rounds, and each dispute cost a lane a round. F20 lived as a code comment for five iterations; filed
as a fulcrum with its measured cost, it was ruled in one exchange.

**hand up a demonstration.** F18 was argued in prose for four rounds and ruled in under a minute once
shown as two commands' output.

## .see also

- `rule.always.itemize-the-fulcrums-you-best-guess` — the mandate this satisfies
- `1.vision.yield.md` — where these forks arose
