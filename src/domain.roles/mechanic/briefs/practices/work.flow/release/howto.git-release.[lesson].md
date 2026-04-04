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

## .footguns

both of these are footguns — avoid unless human explicitly prescribes:

| footgun | why |
|---------|-----|
| `rhx git.release --mode apply` | stops at main, leaves prod dirty |
| `rhx git.release --from main ...` | skips feature branch, assumes main is correct |

```bash
# avoid these:
rhx git.release --mode apply                        # stops at main
rhx git.release --from main --into prod --mode apply  # skips feature branch
```

when you might need them (rare, human-prescribed only):
- `--mode apply` alone: human wants to pause before prod release
- `--from main`: emergency hotfix or recovery from broken state

## .key insight

> don't retry failures — fix them, push, and watch again.

> never leave main dirty — always release to prod with `--into prod --mode apply`.
