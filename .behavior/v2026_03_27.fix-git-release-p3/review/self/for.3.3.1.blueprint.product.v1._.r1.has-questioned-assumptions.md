# review: has-questioned-assumptions

## assumption 1: 90s timeout is sufficient

- **what we assume**: 90s is long enough for release-please to create PR/tag
- **what if opposite?**: if release-please takes >90s, we timeout even when workflow is healthy
- **evidence**: wish explicitly states "90s timeout", vision confirms "90s configurable? — [answered] 90s per wish examples; configurability deferred (YAGNI)"
- **verdict**: assumption is validated by wish. proceed.

## assumption 2: release-please is the workflow name

- **what we assume**: workflow file is named `release-please.yml`
- **what if opposite?**: repos might use `release.yml`, `semantic-release.yml`, etc.
- **evidence**: vision states "we assume 'release-please' as the workflow name. if a repo uses a different name, timeout diagnostics will show 'not found'. this is acceptable for ehmpathy repos but worth the note."
- **verdict**: assumption is documented and acknowledged as limitation. proceed.

## assumption 3: squash merge is used

- **what we assume**: PRs are squash-merged, so `mergeCommit` returns the squash commit
- **what if opposite?**: merge commits or rebase merges would yield different commit SHAs
- **evidence**: vision states "squash merge is used — we use mergeCommit from PR", wish states "must support squash merges"
- **verdict**: assumption is explicit requirement. proceed.

## assumption 4: git merge-base --is-ancestor works for freshness

- **what we assume**: if M1 is ancestor of artifact commit, artifact is fresh
- **what if opposite?**: could there be scenarios where M1 is ancestor but artifact is stale?
- **evidence**: if M1 (merge commit) is ancestor of PR head, that PR head came after M1. this is logically sound — ancestor relationship is transitive and deterministic.
- **verdict**: assumption is mathematically valid. proceed.

## assumption 5: release PR is identifiable by title prefix

- **what we assume**: release PRs start with `chore(release):`
- **what if opposite?**: if title pattern changes, PR lookup fails
- **evidence**: this is extant pattern used in `get_release_pr()` at operations.sh:91-112. already in production.
- **verdict**: assumption uses extant proven pattern. proceed.

## assumption 6: single release PR at a time

- **what we assume**: at most one open release PR exists
- **what if opposite?**: multiple release PRs would cause ambiguity
- **evidence**: extant `get_release_pr()` fails fast if multiple found: "error: multiple release PRs found ($count), expected at most one"
- **verdict**: assumption is enforced by extant code. proceed.

## assumption 7: tag commit equals merge commit

- **what we assume**: tag points to same commit as release PR merge commit
- **what if opposite?**: if tag points elsewhere, freshness check might fail
- **evidence**: release-please creates tag on the merge commit. this is how release-please works.
- **could be simpler?**: yes, we could check if tag commit equals the exact merge commit instead of ancestry. but ancestry is more robust — handles edge cases where tag might be on a child commit.
- **verdict**: assumption is valid for release-please. ancestry check is more robust. proceed.

## assumption 8: poll interval 5s is appropriate

- **what we assume**: poll every 5s for first 60s, then 15s
- **what if opposite?**: could poll too frequently (API rate limits) or too infrequently (slow feedback)
- **evidence**: this matches extant emit_transport_watch.sh pattern at lines 112-120. proven in production.
- **verdict**: assumption uses extant proven pattern. proceed.

---

## simpler approaches considered

### could we skip the poll loop entirely?

no. the artifact might not exist immediately after merge. release-please takes time to run.

### could we use exit 0 instead of AWAIT_RESULT?

maybe. caller could re-fetch the artifact after success. but that doubles API calls and the artifact info is already available. keep AWAIT_RESULT for efficiency.

### could we inline and_then_await in git.release.sh?

no. the wish explicitly requires "single reusable await operation". two call sites (release-pr and tag) would duplicate logic.

---

## summary

all assumptions are either:
1. explicitly validated by wish/vision
2. use extant proven patterns
3. mathematically valid

no hidden assumptions found that require correction.

