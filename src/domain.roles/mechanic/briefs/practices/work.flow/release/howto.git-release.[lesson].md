# howto: use git.release

## .what

after you push, watch CI and release. if CI fails, fix the errors — don't just retry.

## .usecase 1: watch CI after push

```bash
rhx git.release --watch || rhx show.gh.test.errors
```

if CI fails:
1. read the errors with `rhx show.gh.test.errors`
2. fix the flaky test or broken code
3. commit and push the fix
4. watch again: `rhx git.release --watch`

do not blindly retry — take initiative and deflake.

## .usecase 2: release to main

```bash
rhx git.release --mode apply || rhx show.gh.test.errors
```

this enables automerge and watches until merged.

if CI fails:
1. read errors: `rhx show.gh.test.errors`
2. fix the issue
3. push the fix
4. run again: `rhx git.release --mode apply`

## .usecase 3: release to prod

```bash
rhx git.release --to prod --mode apply || rhx show.gh.test.errors
```

this runs the full release cycle: merge release PR → watch tag workflows → deploy.

if it fails:
1. read errors: `rhx show.gh.test.errors`
2. diagnose and fix
3. push the fix
4. run again: `rhx git.release --to prod --mode apply`

## .usecase 4: release from main (skip feature branch)

when on a feature branch but want to release main → prod:

```bash
rhx git.release --from main --to prod --mode apply || rhx show.gh.test.errors
```

this skips the feature branch requirement and releases directly from main.

useful when:
- on a feature branch but want to watch/apply the main → prod release
- want to check release status from any branch
- need to release main to prod without a branch switch

the `--from main` flag works with all modes:
```bash
rhx git.release --from main --to prod                # plan: check status
rhx git.release --from main --to prod --watch        # watch without automerge
rhx git.release --from main --to prod --mode apply   # apply release
```

## .key insight

> don't retry failures — fix them, push, and watch again.

flaky tests and transient errors deserve fixes, not retries. each failure is an opportunity to improve the codebase.
