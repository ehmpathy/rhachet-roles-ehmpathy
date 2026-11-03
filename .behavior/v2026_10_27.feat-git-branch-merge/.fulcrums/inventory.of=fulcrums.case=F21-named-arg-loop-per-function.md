# F21 — named args parsed by a `case` loop in each function, or by one shared parser

## .the fork
peer i001 r003 nitpick.1: each new op repeats `for arg in "$@"; do case "$arg" in k=*) ...; esac; done`.
(a) keep the loop per function; (b) add one shared parser that sets locals from `key=value` args.

## .taken
(a). the per-function loop is the convention across the `git.commit` and `git.branch.rebase` ops
files (`is_local_meter_readable`, `check_org_blocker`, `print_local_meter_damaged_fix`, and the rest),
so each function declares its own inputs where a reader looks. bash cannot set a caller's locals from
a callee without `eval` or nameref tricks, which add the decode cost the nitpick names. the loops the
peers cited as unsafe (`as_commit_uses_after_spend`, `set_commit_meter_state`) now refuse an unknown
key.

## .rework
clean: a shared parser is a mechanical swap per function, no contract moves.

## .risk
low. a typo in a key leaves a default in place; the meter ops, where a typo costs most, refuse it.

## .confidence
85%.

## .where
`git.commit/git.commit.operations.sh`, `git.branch.catchup/git.branch.catchup.operations.sh`.

## .verdict
taken by the driver: an execution fork (seed S6).
