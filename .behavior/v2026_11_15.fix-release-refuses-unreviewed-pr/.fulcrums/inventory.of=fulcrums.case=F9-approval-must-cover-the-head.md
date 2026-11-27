# F9 — an approval counts only on the pr head

## .the fork

peer r010 item 1: a human approves, the clone pushes a fix, `--apply` runs, and the new commit
merges unreviewed.

- accept a stale approval: any human approval on the pr counts
- require the approval on the head: an approval whose `commit_id` is not the pr head counts as none

## .taken

require the head. the gate reads the head via `get_pr_head_sha` (`GET .../pulls/N` → `.head.sha`)
and marks an `APPROVED` review on an older commit as `APPROVED_STALE`, which never approves. the
refusal names it: `why: the approval by @x is on an older commit; the head needs a fresh review`.

why: the wish is that the commander's review stands between the clone and a merge. a stale approval
lets the clone push after the review and merge what no human read: the incident class itself.

## .rework

clean. one jq rule (`as_fresh` in `_jq_review_gate_rules`) and one read. drop the rule and the
read, and stale approvals count again.

## .cost the commander should weigh

every push after an approval (a rebase included) needs a fresh approval before `--apply`.

## .confidence

75%. github's own "dismiss stale approvals" is off by default, so some repos accept stale approvals
by convention.

## .where

`git.release.operations.sh` — `get_pr_head_sha`, `_jq_review_gate_rules`; p9 case6 stale cases

## .verdict

awaits the commander.
