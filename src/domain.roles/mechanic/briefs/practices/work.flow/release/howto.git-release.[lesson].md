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

## .the two meters

| meter | governs | grant |
|-------|---------|-------|
| `git.commit.uses` | commit, stage, rebase, push to this tree's own branch | `git.commit.uses set --quant N` |
| `git.release.uses` | `git.release --mode apply` — the act that ships | `git.release.uses set --quant 1` |

- `--mode apply` reads `git.release.uses` alone; a bare plan previews it, read only; `--watch` and `--retry` read no meter
- a commit grant never ships, and a release grant needs no commit quota
- unpushed commits on the release branch refuse the release (exit 2): push first, via `rhx git.commit.push --mode apply`
- only a human at a terminal grants either meter
- apply checks the stamp first and spends its use at the arm of the merge, then says so
  - a refusal before the arm (no pr, unpushed, behind, red checks) spends none; a failed arm refunds
  - a red ci or a watch timeout after the arm does not refund; `--watch` and `--retry` spend none
  - `--into prod` arms two prs on one use; to ship to prod on a stamp of 1, apply `--into prod` once
- a refusal names every level that blocks (global, org, local) at once

## .migration from the one-meter `--push`

a tree granted before the split keeps its commit grant and loses release, loudly:

| was | now |
|-----|-----|
| `git.commit.uses set --quant N --push allow` | `git.commit.uses set --quant N` — push rides it; `--push` refuses (exit 2) |
| `--stage allow` | retired; stage rides the live commit grant |
| a commit grant that also shipped | no release until a human restamps it |
| `git.commit.uses set --quant 0` revoked commit + push | commit no more; push stays held. to revoke both: `git.commit.uses del` |
| `{ uses: 2, push: "block" }` (commit, never push) | reads as held: push proceeds. to stop push: `git.commit.uses del` |
| `git.commit.uses block --global` halted commits and releases | halts commits only. to halt releases too: `git.release.uses block --global` |
| a rebase needed `--push allow` and a use left | rides the held commit grant, even at 0 left; spends no use |
| `git.commit.push --output json` carried `push_revoked` | field retired; push reads the held grant |

the regrant a human owes:
- per machine: `git.release.uses allow --org <org>` (or `--org @all`); an unset org refuses the release
- per tree: `git.release.uses set --quant 1`
- an old meter file reads as held; the next `git.commit.set` rewrites it to `{ uses, held }`

## .key insight

> don't retry failures — fix them, push, and watch again.

> never leave main dirty — always release to prod with `--into prod --mode apply`.
