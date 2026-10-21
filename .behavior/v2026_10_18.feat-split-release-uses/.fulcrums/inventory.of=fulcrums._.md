# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | the relayed amendment stands in for the unread wish file | clean | closed: canonical wish handed over; diff reported, no gap in the three-meter core | 85% |
| F2 | the push meter is named `git.push.uses` | clean | ruled: yes (human, 2026-10-18) | 80% |
| F3 | levels compose by AND (global ∧ org ∧ local), not radio precedence | clean | best-guessed | 85% |
| F4 | release grant = a quota; one use per `git.release --mode apply` | clean | best-guessed | 75% |
| F5 | push grant = `allow` / `block` only, no quota | clean | best-guessed | 75% |
| F6 | upgrade carries no grant over; first refusal names the split | clean | ruled: yes (human, 2026-10-18) | 80% |
| F7 | a 0-ahead fast-forward refuses when the remote branch holds commits local lacks | clean | best-guessed | 70% |
| F8 | the old `git.commit.uses set --push` flag refuses, no shim | clean | ruled: yes — refuses and names its two replacements (human, 2026-10-18) | 75% |
| F9 | rebase needs a live commit grant but spends no use | clean | best-guessed | 70% |
| F10 | each meter owns its own global kill switch; a commit block no longer halts release | clean | best-guessed | 80% |
| F11 | a tty is not proof of a human; release rests on the deny-list for robot directors | clean | ruled: accepted as no weaker than today; commander to re-review | 70% |
| F12 | `git.stage.add` rides the commit grant; mid-rebase it reads no meter, as `continue`; the `--stage` field retires | clean | ruled: yes (human, 2026-10-19) | 95% |
| F13 | `git.commit.uses allow` writes commit + push; `block` undoes both; release is never bundled | clean | ruled: the bundle (human, 2026-10-19); `block`/`set` shapes best-guessed | 85% |
| F14 | release refuses while the branch holds commits its pr lacks; it never pushes them | clean | best-guessed | 75% |
