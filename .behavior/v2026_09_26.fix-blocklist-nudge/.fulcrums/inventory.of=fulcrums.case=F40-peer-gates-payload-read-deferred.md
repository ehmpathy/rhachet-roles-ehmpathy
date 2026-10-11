# F40 — the untouched peer gates keep their fail-open payload read, for now

## .the fork

- **sweep now:** give every PreToolUse gate the fail-closed payload read (stderr-redirect,
  test-background, tmp-writes), and decide the decider's contract
- **scope it:** fix the gates this route touched (suspicious-syntax, sedreplace), dream the rest

raised by peer review i014 (enroll-impl-arch-defects, blocker.1, graded `urgent`) on the
suspicious-syntax gate.

## .taken — scope it, and why at the time

- the two touched gates are fixed and clamped (suspicious-syntax `[case21]`, proven to bite;
  sedreplace `[case8]`) — the blocker as raised is closed
- the fail-open/fail-closed call is per gate, not a sweep: cross-repo-access and shouted-readme
  fail OPEN by a recorded contract (a jq release whose exit code moved once blocked every call),
  and the decider's "permit" means "lift to the human"
- the other four gates sit outside this route's surface, each with its own suite
- claude code sends a valid payload; the harm needs a malformed one, so the shipped exposure is low

## .rework

**dirty** — four gates and their suites this route never opened, plus one per-gate contract call.

## .confidence — 80%

## .where

`.dream/v2026_10_08.fix.peer-gates-block-a-payload-jq-cannot-parse.md`
