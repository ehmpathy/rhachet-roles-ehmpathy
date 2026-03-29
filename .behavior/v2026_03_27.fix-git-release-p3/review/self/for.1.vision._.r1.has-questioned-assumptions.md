# self-review: has-questioned-assumptions

## reviewed artifacts

- `.behavior/v2026_03_27.fix-git-release-p3/0.wish.md`
- `.behavior/v2026_03_27.fix-git-release-p3/1.vision.md`

---

## assumption 1: release-please creates the release PR

**what we assume**: the workflow named "release-please" creates release PRs

**evidence**: wish line 50 mentions "release-please", common pattern in ehmpathy repos

**what if different workflow?**: timeout diagnostics would show "not found"

**wisher said this?**: implied, not explicit

**verdict**: explicit assumption in vision. documented as acceptable tradeoff for ehmpathy repos.

---

## assumption 2: squash merge is used

**what we assume**: PRs are squash-merged to main

**evidence**: wish line 81 says "squash merge commit on main"

**what if merge commit or rebase?**: would need different logic to find baseline commit

**wisher said this?**: yes, explicitly on line 81

**verdict**: not hidden — explicit in wish.

---

## assumption 3: 90s timeout is sufficient

**what we assume**: release-please runs in <30s, so 90s is ample

**evidence**: vision claims "typically runs in <30s" — where did this number come from?

**what if slow CI?**: might timeout prematurely

**wisher said this?**: wish shows 90s in examples (lines 33, 44) but doesn't justify

**issue found**: the "typically <30s" claim in vision has no evidence. i inferred this.

**fix**: remove the unsupported claim. 90s timeout is acceptable per wish examples, but we shouldn't claim we know typical run times.

**verdict**: partial issue — keep 90s per wish, remove <30s claim.

---

## assumption 4: only one release PR at a time

**what we assume**: there's at most one open release PR to find

**evidence**: not stated anywhere

**what if multiple release PRs?**: which one is "fresh"? first match? latest commit?

**wisher said this?**: no

**issue found**: hidden assumption. if multiple release PRs exist, we need to pick the one with the freshest commit.

**fix**: vision should specify: "find the open release PR (if multiple, take the one with the most recent commit that is ahead of prior merge)". actually, commit freshness check already handles this — we check each PR's commit against prior merge, so we'd find the fresh one.

**verdict**: not actually an issue — commit freshness check implicitly handles multiple PRs by reject stale ones.

---

## assumption 5: `gh pr view --json mergeCommit` returns the squash commit

**what we assume**: this API returns the merge commit ON MAIN, not the PR's head commit

**evidence**: wish line 81 says to get via this method

**what if different?**: would get wrong baseline for freshness check

**wisher said this?**: yes, explicitly

**research needed**: verify `mergeCommit` is indeed the squash commit on main, not the PR's head

**verdict**: explicit in wish, but worth a quick verification at implementation time.

---

## assumption 6: cumulative elapsed time in `💤` lines

**what we assume**: show 5s, 10s, 15s (cumulative) not 5s, 5s, 5s (interval)

**evidence**: wish examples show 5s, 10s pattern (lines 31-32, 54-55)

**wisher said this?**: examples show cumulative, but not explicit

**verdict**: already raised as open question in vision. not hidden.

---

## assumption 7: "found!" message format

**what we assume**: message is `✨ found! after Xs` with "after" phrasing

**evidence**: wish line 56 shows `└─ ✨ found! after 10s in wait`

**what if different text?**: "in Xs" vs "after Xs"

**wisher said this?**: yes, explicitly "found! after 10s in wait"

**verdict**: explicit in wish. vision matches.

---

## assumption 8: workflow lookup on timeout always targets "release-please"

**what we assume**: we always look up "release-please" workflow, even for tag timeout

**evidence**: wish lines 44-47 show `🔴 release-please` for tag timeout too

**makes sense?**: yes — release-please workflow creates both the release PR AND the tag

**wisher said this?**: yes, implicitly in examples

**verdict**: not hidden — consistent with how release-please works.

---

## summary

| assumption | verdict | action |
|------------|---------|--------|
| release-please workflow | explicit | documented in vision |
| squash merge | explicit | stated in wish |
| 90s timeout | partial issue | remove "<30s" claim from vision |
| single release PR | non-issue | freshness check handles multiple |
| mergeCommit API | explicit | verify at implementation time |
| cumulative time | open question | already raised in vision |
| "found!" format | explicit | matches wish |
| workflow = release-please for both | explicit | consistent with wish examples |

## issues found & fixed

1. **"typically <30s" claim**: removed unsupported claim. 90s is acceptable per wish, but we don't have evidence for typical run times.

## updates to vision

need to edit vision to remove line 180's "<30s" claim.
