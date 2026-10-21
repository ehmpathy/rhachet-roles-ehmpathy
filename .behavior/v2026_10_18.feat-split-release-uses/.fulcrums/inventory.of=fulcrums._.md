# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | the relayed amendment stands in for the unread wish file | clean | closed: canonical wish handed over; then superseded by the commander's two-meter order (F15) | 85% |
| F2 | the push meter is named `git.push.uses` | clean | dissolved: no push meter exists (F15) | — |
| F3 | levels compose by AND (global ∧ org ∧ local), not radio precedence | clean | best-guessed | 85% |
| F4 | release grant = a quota; one use per `git.release --mode apply` | clean | best-guessed | 75% |
| F5 | push grant = `allow` / `block` only, no quota | clean | dissolved: push rides the commit grant (F15, F16) | — |
| F6 | upgrade carries no release grant over; first refusal names the split | clean | ruled: yes (human, 2026-10-18) | 80% |
| F7 | a 0-ahead fast-forward refuses when the remote branch holds commits local lacks | clean | best-guessed | 70% |
| F8 | the old `git.commit.uses set --push` flag refuses, no shim | clean | ruled: yes (human, 2026-10-18); hint now names `set --quant N` alone | 75% |
| F9 | rebase needs a live commit grant but spends no use | clean | best-guessed | 70% |
| F10 | each meter owns its own global kill switch; a commit block no longer halts release | clean | best-guessed | 80% |
| F11 | a tty is not proof of a human; release rests on the deny-list for robot directors | clean | ruled: accepted as no weaker than today; commander to re-review | 70% |
| F12 | `git.stage.add` rides the live commit grant; mid-rebase it reads no meter, as `continue`; the `--stage` field retires | clean | ruled: yes (human, 2026-10-19) | 95% |
| F13 | `git.commit.uses allow` covers commit + push; release is never bundled | clean | folded into F15 — one meter, not a bundle of two | 90% |
| F14 | release refuses while the branch holds commits its pr lacks; it never pushes them | clean | best-guessed | 75% |
| F15 | two meters, not three: push rides `git.commit.uses`; `git.release.uses` alone gates release | clean | ruled: the commander's order, 2026-10-20 | 95% |
| F16 | a push spends no commit use and proceeds on a held grant at 0 left; only `block` / `del` revoke | clean | best-guessed — commander's words leave it open | 75% |
| F17 | the commit-but-never-push grant retires; no `--push block` sub-grant | clean | best-guessed — commander's words leave it open | 70% |
