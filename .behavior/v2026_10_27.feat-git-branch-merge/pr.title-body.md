# pr.title-body — #1205

held here until a paved `git.pull.title` / `git.pull.description` verb ships (#1173). set both from
this file verbatim: the title is the `## title` line, the body is all of `## body`. no human sets it.

## title

feat(git): git.branch.catchup, catch up a pushed branch via one merge commit from origin/main

## body

### what it does

a mechanic whose pr reads CONFLICTING, or just behind main, can now level its branch with main
with no history rewrite and no force push. `rhx git.branch.catchup` makes one merge commit of
origin/main into the current feature branch, through the same commit meter and sponsor as
`git.commit.set`. the push after it is plain, under `git.commit.push`. closes #1193.

| subcommand | does |
|---|---|
| `begin` | fetch origin/main; plan by default, `--mode apply` merges. refuses on main or master, on a dirty tree, and with a rebase or merge in flight |
| `take --whos <main\|branch> <paths…>` | settle a conflicted file by one side, and stage it |
| `lock refresh` | refresh a taken lockfile against the merged `package.json` (pnpm, npm, yarn), and stage it |
| `continue` | make the merge commit once every conflict is settled; refuses on markers still in a file |
| `abort` | back out to the state before the merge |

a conflict stops loud (exit 2), names each file, and prints the next moves as paste-ready commands.

### what rides along, and why

- `git.commit/git.commit.operations.sh` + `git.commit.set.sh`: the meter, sponsor, and blocker
  gates move out of `git.commit.set.sh` into shared operations, so catchup's merge commit passes the
  same gates (F11). three changes reach `git.commit.set` users:
  - it refuses while a merge is in flight, and names `catchup continue` or `abort` (F28)
  - its push-permission refusal now speaks after the sponsor gate, the one gate order catchup uses;
    no test pinned the old order
  - the lifted leaves are hardened: a token-fetch failure renders one leaf per line, the quota
    guards name `'infinite'` and `corrupt, absent, spent`, and the meter reads at the spend. code
    on main that this pr only moved is untouched; its peer concerns sit in a dream (F19, F36)
- permission hook: `git merge`, `git merge --abort`, `git merge --continue` now point at the catchup
  verbs; the catchup verbs are pre-approved in `init.claude.permissions.jsonc`
- `boot.yml`: the catchup dispatcher boots by path; its subcommand bodies and all test code under
  `skills/` drop from the boot, budget unchanged (F13, F16)
- `.github/workflows/.test.yml`: pnpm on the integration and acceptance runners, for the real lock
  refresh journeys
- `package.json` + `pnpm-lock.yaml`: routine rhachet and role package bumps from commit `2259f19`,
  kept in place since a split needs a force push (F23)
- `.agent/.actors/.../settings.of.grove.json`: a regenerated home path (`/home/camper`); a
  generated file, no behavior
- `.agent/repo=.this/role=any/`: a `playtest.git.branch.catchup` harness for by-hand walks (F33) and
  the `git.branch.catchup` domain term
- `.behavior/v2026_10_27.feat-git-branch-merge/` + `.dream/`: the route (vision, execution,
  verification yields; fulcrums F1–F37; seeds; peer reviews) and the follow-ups caught as dreams

### how it was verified

- integration, temp repos with a bare origin: catchup 333 passed; hook, commit ops, commit.set 468
  passed; git.commit 596 passed
- acceptance through rhachet: 67 passed. help, refusals, the clean journey, conflict by take and by
  hand, abort, the #1021 lockfile walk, and the `git.commit.push` plan after the merge
- full integration 4578 passed (134 skips predate this pr, F29); full acceptance 275 passed
- a by-hand playtest of each journey from `src/` and `dist/`
- every render snapped; ci green

### how to review it fast

1. the experience: `.behavior/v2026_10_27.feat-git-branch-merge/1.vision.yield.md`, then the
   journey snap `src/domain.roles/mechanic/skills/git.branch.catchup/__snapshots__/git.branch.catchup.journey.integration.test.ts.snap`
2. the verb: `git.branch.catchup.begin.sh` and `git.branch.catchup.continue.sh`; `take`, `lock`, and
   `abort` are small
3. the lift: `git diff origin/main -- src/domain.roles/mechanic/skills/git.commit/` — moved gates,
   plus the mid-merge refusal
4. the proof: `5.3.verification.yield.md`
5. skip on a first pass: `.reviews/`, `.route/`, the per-fulcrum and per-seed entries; the
   summaries `inventory.of=fulcrums._.md` and `inventory.of=seeds._.md` hold the decisions

### open for review

- **F25** (open for the commander; changes what the verb does): where the branch's own remote moved,
  catchup merges origin/main only, and the plain push after it is rejected
- **F31** (end council): shell ops stay in their skill dirs; a move to `domain.operations` needs a
  build and source-path change, held in a dream
- **F22**: `git.release` still hints a rebase for a CONFLICTING pr; repointed in a follow-up
- **F34**: render copy changed with its tests and the vision; a test-intent reviewer disputes each
  reworded criterion
- **F36**: shared commit-gate and hook renders keep their shipped shape; their reshape is a dream

never merged and never released from this branch: the release waits on the commander.
