# F13 — the worktree's half-landed husky upgrade refuses every commit

## .fork
the worktree `.husky/pre-commit` (churn, F6) runs `check.timestamps.lock.sh`. the lock wants the index blob of `check.timestamps.sh` to equal the upgrade's `afea02de…`. the index holds HEAD's `151bc070…`, because the upgrade is not committed. so every commit on this tree refuses, whatever it stages.

the options:
- (a) stage the upgraded `check.timestamps.sh`: ships husky churn in this pr
- (b) skip hooks (`--no-verify`): a workaround that also skips the timestamp and secret checks
- (c) for the commit alone, put HEAD's `pre-commit` in place, so the hooks main ships run in full; restore the worktree copy after

## .taken
(c). the commit holds no hook file, so main's own hooks are the right gate for it. the worktree copy is backed up at `.agent/.cache/husky-aside/pre-commit` and restored byte for byte after each attempt.

## .rework
clean. no file in the pr changes; the worktree ends as found.

## .confidence 85%
an owner of the husky upgrade could want it landed first. the upgrade has its own defects (dream `husky-lock-and-secrets-defects`), so that is its own pr.

## .verdict
overruled by the director: the swap is dropped. the director reset the worktree `.husky` to HEAD and kept the upgraded copies aside, so main's `pre-commit` runs as is and no swap is needed.
