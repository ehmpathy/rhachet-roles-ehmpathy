# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | the relayed amendment stands in for the unread wish file | clean | closed: canonical wish handed over; then superseded by the commander's two-meter order (F15) | 85% |
| F2 | the push meter is named `git.push.uses` | clean | dissolved: no push meter exists (F15) | — |
| F3 | levels compose by AND (global ∧ org ∧ local), not radio precedence | clean | best-guessed | 85% |
| F4 | release grant = a quota; one use per `git.release --mode apply` | clean | best-guessed | 75% |
| F5 | push grant = `allow` / `block` only, no quota | clean | dissolved: push rides the commit grant (F15, F16) | — |
| F6 | upgrade carries no release grant over; first refusal names the split | clean | ruled: yes (human, 2026-10-18) | 80% |
| F7 | a 0-ahead fast-forward refuses when the remote branch holds commits local lacks | clean | best-guessed; built in 5.1 (journey6), refusal names `git pull --ff-only` | 70% |
| F8 | the old `git.commit.uses set --push` flag refuses, no shim | clean | ruled: yes (human, 2026-10-18); hint now names `set --quant N` alone | 75% |
| F9 | rebase rides the held commit grant, even at 0 left, and spends no use | clean | best-guessed; moved from "live grant" at i004 (behavior-intent 1): the wish's two-trip incident recurs at 0 left otherwise | 80% |
| F10 | each meter owns its own global kill switch; a commit block no longer halts release | clean | best-guessed | 80% |
| F11 | a tty is not proof of a human; release rests on the deny-list for robot directors | clean | ruled: accepted as no weaker than today; commander to re-review | 70% |
| F12 | `git.stage.add` rides the live commit grant; mid-rebase it reads no meter, as `continue`; the `--stage` field retires | clean | ruled: yes (human, 2026-10-19) | 95% |
| F13 | `git.commit.uses allow` covers commit + push; release is never bundled | clean | folded into F15 — one meter, not a bundle of two | 90% |
| F14 | release refuses while the branch holds commits its pr lacks; it never pushes them | clean | best-guessed | 75% |
| F15 | two meters, not three: push rides `git.commit.uses`; `git.release.uses` alone gates release | clean | ruled: the commander's order, 2026-10-20 | 95% |
| F16 | a push spends no commit use and proceeds on a held grant at 0 left; only `block` / `del` revoke | clean | best-guessed — commander's words leave it open | 75% |
| F17 | the commit-but-never-push grant retires; no `--push block` sub-grant | clean | best-guessed — commander's words leave it open | 70% |
| F18 | the PermissionRequest decider lost under the rhachet 1.49 layout returns via a repo-local init chained in prepare:rhachet (narrow), not the mechanic role init (B) nor a tracked actor file (A) | clean | ruled by the director: narrow reach; B reverted; 310/310 from a fresh tree | 85% |
| F19 | apply checks the stamp first and spends its one use at the arm of the merge; a refusal before the arm spends none, a red ci after it does not refund | clean | best-guessed — the vision says "spends one use", not when | 80% |
| F20 | a legacy `{uses, push}` file reads as held unless it is `uses 0` + `push block`; a legacy `push block` with uses left now pushes | clean | best-guessed — the old "commit but never push" grant retires (F17), so its file reads as the commit grant it still holds | 70% |
| F21 | the shared atomic meter writer is deferred to a dream; the new writers copy the extant temp-then-`mv` shape | dirty | best-guessed — four of seven sites predate this stone | 80% |
| F22 | the begin arms this stone writes follow exit-code semantics (constraint 2, malfunction 1); the untouched arms keep exit 1 and ride a dream | dirty | best-guessed — the peer review named the stone's own arms | 80% |
| F23 | stage, rebase, and the release gate source `git.commit/` readers in place; the lift to a shared `git.meter/` seam is deferred to a dream | dirty | best-guessed — disputes the reach-in blocker (r4, r5); the shared reader is what closed the fail-open | 75% |
| F24 | the role entry files keep their `get*Role.ts` names; no rename rides the meter split | clean | best-guessed — every role shares the shape (r4 nitpick.2) | 85% |
| F25 | the two-meter done-test journey is deferred to a dream; each step stays clamped by its own suite | dirty | best-guessed — disputes i003 intent nitpick.2; the journey needs a new acceptance harness edge | 80% |
| F26 | a release stamp counts applies; it pins no sha and does not gate `--retry` | dirty | best-guessed — disputes i004 arch-defects 1, 2; a sha-pinned stamp is a new contract (dream) | 65% |
| F27 | one pr carries the split, the 1.49 layout, the bhrain patch, and the ci cures | clean | ruled by the director's order ("do not split the bump off") | 90% |
| F28 | rebase and stage read the global blocker now; the org blocker is deferred (it fails closed on an unset org) | dirty | best-guessed — i006 arch-defects blocker.2, global half fixed; dream caught | 70% |