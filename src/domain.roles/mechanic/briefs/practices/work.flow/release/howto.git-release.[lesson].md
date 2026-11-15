# howto: use git.release

## .what

after you push, watch cicd in plan mode. if cicd fails, fix the errors — don't just retry.

after cicd passes, release into prod. never leave main dirty.

## .usecase 1: watch cicd after push

```bash
rhx git.release --watch || rhx show.gh.test.errors
```

if cicd fails:
1. read errors with `rhx show.gh.test.errors`
2. fix the flaky test or broken code
3. commit and push the fix
4. watch again: `rhx git.release --watch`

do not blindly retry — take initiative and deflake.

## .usecase 2: release to prod

**always watch first, then release.** this lets you catch cicd issues before release and bundle fixes if needed.

```bash
# step 1: watch cicd (plan mode, no automerge)
rhx git.release --watch || rhx show.gh.test.errors

# step 2: after cicd passes, release to prod
rhx git.release --into prod --mode apply --watch
```

this handles both transports (feat→main→prod):
1. merge feature pr to main
2. wait for release-please pr
3. merge release pr
4. watch tag workflows (publish/deploy)

if cicd fails at any step:
1. read errors: `rhx show.gh.test.errors`
2. fix the issue
3. push the fix
4. watch again: `rhx git.release --watch`

## .usecase 3: the review gate refuses

`--apply` (into main or prod) merges a feature pr only if a human with repo authority approved
its current head. plan and `--watch` never read reviews.

```bash
rhx git.release --into prod --mode apply --watch
# → exit 2: ✋ ConstraintError: pr #42 has no approval from a human
#           why: no reviews yet
#           ask your human to review: <url>
```

1. stop; hand the url to your human and say a review is owed
2. do not retry or reflag; no flag lifts the gate
3. once approved, re-run the same command

the `why:` line names what is owed: no reviews, changes requested, an approval on an older commit
(push fixes before the review), a dismissed review, only comments, or an approval that does not
count (a bot, a robot account, no repo authority).

while an apply watch runs, it holds the approved head. each poll re-checks the head and the
reviews: a moved head or a lost approval (changes requested, dismissed) disarms automerge and
refuses. any other exit short of a merge (checks red, rebase needed, timeout, a gh fault, ctrl-c,
SIGTERM) disarms it too, so no unreviewed push can merge. `--apply` re-arms it after the gate
re-judges the head.

## .default: `--into prod`

to ship your work, the default and safe command is:

```bash
rhx git.release --into prod --mode apply --watch
```

this handles the full feat→main→prod cycle and, critically, **awaits the fresh
release pr for your merge** — so you never race release-please.

## .footguns

both of these are footguns — avoid unless human explicitly prescribes:

| footgun | why |
|---------|-----|
| `rhx git.release --mode apply` | stops at main, leaves prod dirty |
| `rhx git.release --from main ...` | skips feature branch; grabs the STALE prior release pr |

```bash
# avoid these:
rhx git.release --mode apply                        # stops at main
rhx git.release --from main --into prod --mode apply  # skips feature branch
```

### why `--from main` is dangerous

right after `--into main` merges your pr, release-please takes ~30s to open the
**fresh** release pr. if you run `--from main` in that window, it targets the
**stale prior** release pr — not yours. `--into prod` avoids this entirely: it
awaits the release pr that corresponds to your merge.

so: **if you just want to ship your current work, use `--into prod`.** that is
almost always what you actually want.

### the reconsider gate (non-humans)

a non-human (clone) on a feature branch that runs `--from main` is **stopped** with a
ConstraintError (exit 2) that asks "can you just `--into prod`?" and points you back to
the safe default. this keeps clones in the pit of success — nine times out of ten,
`--into prod` is exactly what you wanted.

```bash
# stopped for a clone on a feature branch:
rhx git.release --from main --into prod
# → exit 2: "can you just --into prod?"
```

if you are truly in a hotfix/recovery situation where `--from main` is required, the
block message tells you how to proceed. humans at a terminal (TTY) are not gated.

when you might need them (rare, human-prescribed only):
- `--mode apply` alone: human wants to pause before prod release
- `--from main`: emergency hotfix or recovery from broken state

## .key insight

> don't retry failures — fix them, push, and watch again.

> never leave main dirty — always release to prod with `--into prod --mode apply`.
