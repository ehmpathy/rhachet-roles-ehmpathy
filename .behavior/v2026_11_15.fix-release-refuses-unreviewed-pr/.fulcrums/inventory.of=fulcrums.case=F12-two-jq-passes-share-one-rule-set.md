# F12 — the verdict and the cause stay two jq passes over one rule set

## .the fork

peer i005 r011 item 3: `is_pr_approved_by_human` and `get_review_gate_cause` each evaluate
`latest_decisive`; the programs live in double-quoted shell.

- merge them: one pure `judge_pr_review_gate` → `{approved, cause}`, in a single-quoted heredoc
  with `--arg`, in its own file, tested data-driven with no gh mock
- keep them: two transformers over one shared `_jq_review_gate_rules`

## .taken

keep them. the shared rules make the two read one definition; the cause runs only on the refusal
path. the merge is a pure refactor with no behavior change, and this fix already moves the gate,
the pin, and the stream split.

## .rework

clean. one new file and its data-driven test; the guard calls one transformer instead of two.

## .confidence

85%. the refactor is sound; only when it lands is in question.

## .where

`git.release.operations.sh` (`_jq_review_gate_rules`, `is_pr_approved_by_human`,
`get_review_gate_cause`); `git.release._.guard_pr_has_human_approval.sh`

## .verdict

awaits the commander.
