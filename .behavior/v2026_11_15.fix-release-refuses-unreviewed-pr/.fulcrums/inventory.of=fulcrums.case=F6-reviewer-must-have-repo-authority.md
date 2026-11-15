# F6 — an approver must hold authority on the repo

## .the fork
- (a) any human login's APPROVED counts
- (b) only a human whose review `author_association` is OWNER, MEMBER, or COLLABORATOR counts

## .taken
(b). sdk-aws-lambda and rhachet-roles-ehmpathy are both public (`gh repo view` → `PUBLIC`), and
github lets any signed-in user submit an APPROVED review on a public pr. under (a) a stranger's
approval would lift the gate. the rest review carries `author_association` (verified on #1022:
`MEMBER`). github's own required-review rule counts only reviewers with write access; (b) is the
nearest client-side read of that.

## .rework
clean: one more clause in the approval transformer.

## .confidence
90%. CONTRIBUTOR (a past committer with no current role) is excluded; a reviewer may want it in.

## .where
the approval transformer in `git.release.operations.sh`.

## .verdict
awaits the commander.
