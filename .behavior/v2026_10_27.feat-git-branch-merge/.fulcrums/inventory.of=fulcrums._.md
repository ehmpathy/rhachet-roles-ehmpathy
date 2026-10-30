# inventory.of=fulcrums

surfaced at 1.vision. the route has no blueprint stone, so the commander review sits here. a
fulcrum the code or a rule settles is marked answered; one only the director or commander can
settle waits. `risk` = the harm if the choice proves wrong, graded by the harm one can name; each
entry holds the reason.

| case | title | rework | risk | status | confidence |
|---|---|---|---|---|---|
| F1 | leave `git.commit.push` and its `--force-with-lease` as is | clean | low | answered: ruled by the director (seed S1) | n/a — a director's call |
| F2 | merge `begin --mode apply` does not require `push: allow` | clean | low | answered by code (`git.commit.set.sh:800`) | 90% |
| F3 | merge commit header `cont(branch): merge origin/main into <branch>` | clean | low | answered by rule (commitlint, commit-scopes) | 85% |
| F4 | plan does not predict conflicts (merge-tree deferred) | clean | low | answered: out of wish scope | 85% |
| F5 | always `--no-ff` | clean | low | answered by code (`git.commit.push.sh:369-385`) | 95% |
| F6 | verb `git.branch.catchup` with rebase-twin subcommands | dirty after release | low | answered: named by the director (seed S4) | 85% |
| F7 | `--whos` takes `main` or `branch` on merge, not `ours` or `theirs` | clean | low | answered by rule (`rule.forbid.ambiguous-labels`) | 85% |
| F8 | conflict stop exits 2, unlike rebase's 1 | clean | low | answered by rule (`rule.require.exit-code-semantics`) | 95% |
| F9 | plan previews and flags on mutation-only gates; refuses on intent and human halts | clean | low | answered by precedent (`git.commit.set` plan split) | 85% |
| F10 | dispute i003 blockers: both grade content the files do not hold | clean | low | answered: disputes stand, ruled by the director (seed S2) | 95% |
| F11 | commit step: extract the `git.commit.set` gate leaves into `git.commit.operations.sh` (blueprint C1) | clean | low | taken by the driver: an execution fork (seed S6) | 80% |
| F12 | `lock refresh`: a new copy in catchup, exit 2, manifest check (blueprint C2) | clean | low | taken by the driver: an execution fork (seed S6) | 85% |
| F13 | boot slot `ref`; budget unchanged (blueprint C3) | clean | low | answered: the director's call (seed S6) | n/a — a director's call |
| F14 | rebase twin's debt stays out; the dream holds it (blueprint C4) | clean | low | answered: the director's call (seed S6) | n/a — a director's call |
| F15 | a rebase in flight refuses begin in both modes (vision cell #13 had plan flag it) | clean | low | taken by the driver: an execution fork (seed S6) | 90% |
| F16 | src boot `not`: catchup subcommand bodies, plus test code under `skills/` | clean | low | taken by the driver: an execution fork (seed S6) | 85% |
| F17 | catchup holds own git-state readers; lift the two shared one-liners once the rebase debt is paid | clean | low | taken by the driver: an execution fork (seed S6) | 80% |
| F18 | commit-gate refusals (blockers, quota, sponsor) keep the lifted `git.commit.*` render, not the vision sketch's header-first form | clean | low | taken by the driver: an execution fork (seed S6) | 75% |
| F19 | peer concerns on `git.commit.operations.sh` code present on main unchanged: defer to a dream; fix only the leaves this PR lifted or added | clean | low | taken by the driver: an execution fork (seed S6) | 85% |
| F20 | intent reviewer (i001 r008) read the diff as git.commit-only: refute with the catchup file list | clean | low | taken by the driver: a refutation with cited evidence | 95% |
| F21 | named args parsed by a `case` loop per function, not one shared parser | clean | low | taken by the driver: an execution fork (seed S6) | 85% |