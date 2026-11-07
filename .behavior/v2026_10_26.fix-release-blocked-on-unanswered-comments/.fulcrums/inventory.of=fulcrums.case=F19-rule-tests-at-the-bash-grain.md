# F19 — the unanswered rule is tested through its two verbs, not a separate caselist

## the fork
- **a.** cover `as_rows_unanswered`, `is_comment_gate_refusal`, `as_automerge_display` through `git.pull.comment` case21 and p9 case1–case19
- **b.** add a data-driven caselist suite that sources the bash module and walks the rule's matrix directly

## taken: a, and why at the time
the transformers are bash + jq; a "unit" suite still spawns bash per case, so it runs at the grain the two verb suites already run at. case21 walks the rule's matrix (signed vs unsigned, bot, resolved, issue `answer-<id>` vs a foreign key, re-ask with `answered_before`, `answer_key` stamps), and p9 walks the release verdicts and displays end to end.

## rework: clean
a new test file; no prod code moves.

## confidence: 70%, and why it is low
a caselist would read faster and pin the matrix in one place; a third consumer of `rows.sh` would want it.

## where
`git.pull.comment.integration.test.ts` case21; `git.release.p9.comment_gate.integration.test.ts`

## verdict
open
