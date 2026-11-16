# domain.term: git.branch.catchup

## .term

`git.branch.catchup` — a domain operation (dop), shape `[...noun].[verb]` per the rhx skill convention
(`git.branch.rebase`, `git.commit.set`).

**what it does**: brings the current feature branch level with `origin/main` by one merge commit;
rewrites no history, so the push that follows is a fast-forward.

## .etymology

"catch up" is the phrase a clone and a human both reach for when a pr falls behind main ("catch up
with main"). it names the **outcome** (the branch is no longer behind), not the git mechanism.

why this word over its rivals:

| rejected | why |
|---|---|
| `merge` | in this toolset "merge" lands a pr into main: `gh pr merge` (on the deny list, `inits/init.claude.permissions.jsonc:177`), `git.release.sh:6` ("merge feature branch pr to main"). `git.branch.merge` would point the opposite way |
| `remain` | a pun on "re-main"; the eye reads the english "stay" first |
| `repull`, `pullup`, `pullin`, `pullmain` | "pull" already names git's own `pull` (fetch the branch's own remote) and the rebase verb's act (`git.branch.rebase.begin.sh:240`: `git pull origin main --rebase`); the name would not tell the history-safe verb from the rewrite |
| `upmain` | looks like "update main", the wrong target |
| `update` | github's "update branch" does this act, but `update` is on the mechanic ubiqlang overload list |
| `sync`, `level` | direction-neutral |
| `refresh` | vague; already a subcommand (`lock refresh`) |
| `absorb` | clashes with the well-known `git absorb` tool |
| `inherit` | direction-plain, but abstract |

## .evidence

- **domain-expert narrative**: the vision's mental model records the phrase a clone uses — "i pulled
  main into my branch", with "catch up" and "level with main" as the synonyms
  (`.behavior/v2026_10_27.feat-git-branch-merge/1.vision.yield.md` § mental model)
- **precedent in the toolset**: a grep for the rivals — `merge` in `git.release.sh`, `pull` in
  `git.branch.rebase.begin.sh` — shows each already carries a sense here; `catchup` appears in no
  extant skill
- **scenario timeline**: the #1021 journey (`1.vision.experience.case=7.the-1021-journey.md`)
  narrates the act end to end: plan, conflict, settle, commit, fast-forward push
- **dimensional decomposition**: `1.vision.experience.dimensions.md` walks the verb's 7 axes into 57
  cells

## .the residual ambiguity, and its cure

`catchup` alone leaves two questions: **how** (a rebase also catches up) and **from what** (main is
implied). the output answers both before any mutation: `--help` and every plan open with
`catch up via merge (no rewrite) from origin/main`. plan is the default mode, so a clone reads it
first.

## .inputs / effect

- **subcommands**: `begin [--mode plan|apply]` · `take --whos main|branch <paths>` · `lock refresh` ·
  `continue` · `abort`
- **effect**: one 2-parent commit (first parent = the prior HEAD, second = `origin/main`), authored
  by the seaturtle robot, with the sponsor `Co-authored-by` trailer; meter `uses − 1` (or stays
  `infinite`)

## .invariants

1. never writes to main or master
2. never commits over uncommitted work, staged or unstaged
3. never rewrites a commit; HEAD's prior value is always the first parent of the new commit
4. never commits without a commit use, a clear global/org blocker, and a sponsor — the
   `git.commit.set` gates, in that order
5. always `--no-ff`: the result is a merge commit, never a fast-forward
6. the side names are `main` and `branch`, never git's `ours` / `theirs`
