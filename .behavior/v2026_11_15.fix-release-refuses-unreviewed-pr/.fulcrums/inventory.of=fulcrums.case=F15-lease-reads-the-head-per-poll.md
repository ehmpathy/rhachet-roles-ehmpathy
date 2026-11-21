# F15 — the lease reads the head with its own call each poll

## .the fork

peer i007 r011 item 3: `_check_automerge_lease` calls `get_pr_head_sha` (rest) on top of the
`get_pr_status` call the poll already made.

- add `headRefOid` to the `--json` list of `get_pr_status`: one snapshot serves the guard, the pin,
  and the lease, and a poll costs no extra call
- keep one head reader, `get_pr_head_sha`, for the gate, the pin, and the lease

## .taken

one head reader. the gate, the pin, and the lease all read the head through the same function, so
the sha the gate judged and the sha the lease compares come from one contract. the status json
stays as it is, so no status fixture in p1–p8 changes. the extra call is one rest read per poll
(every 5–15s), far under the rate limit.

## .rework

clean. add `headRefOid` to the status read, read it in the three callers, add it to the status
fixtures.

## .confidence

80%. the reviewer's shape has one fewer failure state (`head-failed`), and that is a fair gain.

## .where

`git.release.operations.sh` (`get_pr_status`, `get_pr_head_sha`);
`git.release._.emit_transport_watch.sh` (`_check_automerge_lease`)

## .verdict

awaits the commander.
