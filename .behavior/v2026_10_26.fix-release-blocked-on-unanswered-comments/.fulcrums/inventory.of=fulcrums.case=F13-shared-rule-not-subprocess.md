# F13 — git.release shares the rule, not the verb

## the fork
- A: git.release runs `rhx git.pull.comment get --unanswered --output json` as a subprocess
- B: the pure row transformers + `as_rows_unanswered` move into `git.pull.comment.rows.sh`; both verbs source it; git.release reads the lists with its own gh calls

## taken: B, and why (at execution)
A drags in the get verb's preconditions, each wrong for a release: the home-org fence (`check_comment_repo_in_home_orgs` reads `~/git/<org>/`, absent in ci and in tests), the cwd-origin parse, a viewer-login graphql call, and its own credential fetch beside git.release's. B keeps the vision's promise — one rule, never forked — at the level that matters: the rule and the key grammar have one home; only the gh read is per-verb.

## rework: clean
git.release's call site is one function, `get_all_pr_comment_rows` (`git.release.operations.sh`); a swap to the subprocess changes it alone.

## confidence: 85%, and why not higher
two row builders now exist (`shape` in get.sh, `as_comment_rows_from_gh_lists` in rows.sh). both read the key via the one `COMMENT_KEY_CLAIM_REGEX`, yet a field added to one could be missed in the other.

## where
`src/domain.roles/mechanic/skills/git.pull.comment/git.pull.comment.rows.sh`, `git.release.operations.sh:get_all_pr_comment_rows`

## verdict
open
