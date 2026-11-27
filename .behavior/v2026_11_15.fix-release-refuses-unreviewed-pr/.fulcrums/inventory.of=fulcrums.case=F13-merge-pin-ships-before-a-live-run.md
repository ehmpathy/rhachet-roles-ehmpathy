# F13 — the merge pin ships before a live run proves it

## .the fork

peer i006 r010 item 2: `--match-head-commit` on `gh pr merge --auto` is proven only against the
mock. github may enforce `expectedHeadOid` on auto-merge, check it only at enable, word its refusal
otherwise, or reject the field.

- hold the pin until a live run on a sandbox pr proves it
- ship the pin now, fail closed in every outcome, and route the live run to a human with a write
  grant

## .taken

ship it. each outcome fails closed: enforced → exit 2; checked only at enable → the lease covers
later pushes; refusal worded otherwise → exit 1, still no merge; field rejected → every approved
apply exits 1, loud. none merges an unreviewed head. gh's own source sends the field in
`EnablePullRequestAutoMergeInput`. the live run needs a write grant on a sandbox pr, which a clone
does not hold (raw `gh pr merge` is denied).

## .rework

clean. drop `pin_args` in `enable_automerge`, or fix the matcher text once the live run records it.

## .confidence

85%. the worst outcome (field rejected) blocks releases until reverted, but merges naught.

## .where

`git.release.operations.sh` (`enable_automerge`, `_is_gh_output_head_moved`); dream
`2026_09_26.add-real-gh-contract-test-for-git-release.dream.md`, ".the merge pin, a write contract"

## .verdict

awaits the commander: one live `gh pr merge --auto --squash --match-head-commit <stale-sha>` on a
sandbox pr settles it.
