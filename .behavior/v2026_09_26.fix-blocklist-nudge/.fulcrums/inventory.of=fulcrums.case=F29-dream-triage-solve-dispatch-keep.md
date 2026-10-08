# F29 — the route's 14 dreams: which to solve now, dispatch, or keep

- **the ask (wisher, 2026-10-07):** *"from the dreams, each that you did please remove — solve any
  non deferrables; and dispatch any reseeds"*
- **fork:** for each dream, solve now · dispatch · keep deferred.
- **taken:**

| dream | verdict | where it landed |
|---|---|---|
| nudge rank skips a global flag before the subcommand | solved | `set_flagless_words` + advice line; case53 `[t0]`–`[t4]`, proven to bite |
| nudge splits shell loops into keyword parts | solved | keyword strip in `as_part_words` + `grammar` kind; case54 `[t0]`–`[t2]`, proven to bite (and caught a regression on bare `VAR=value`) |
| sedreplace guard suggests a command with broken quotes | solved | quote-safe suggestion, NUL join, glob carried; case7, proven to bite |
| permission gates share an untested allow matcher | solved | `permission-gates.parity.integration.test.ts` (containment + plain equality), proven to bite |
| PreToolUse gates fail open on a runtime crash | solved | EXIT trap in all 10 other gates; `pretooluse.gates-fail-closed.integration.test.ts` reads every gate from disk |
| route Stop hook fires inside reviewer clones | dispatched | ehmpathy/rhachet-roles-bhrain#599 |
| bhuild guards name an unregistered brain slug | dispatched | ehmpathy/rhachet-roles-bhuild#444 (still live in bhuild 0.21.37) |
| report nudged commands upstream | kept | the wish itself said "catch a dream" |
| require a `--why` to bust through | kept | wisher: *"for now, just the nudge is fine"*; waits on ledger evidence |
| prior skips hide suites | kept | F19, ruled defer |
| integration suites bound to host load + gh login | kept | F20, ruled defer |
| lift the fuzzy rank into a lib | kept | no second consumer yet (wet-over-dry) |
| lift the render operations into a lib | kept | F21, open |
| rank tie-break + per-part budget | kept | F25, open; re-snaps renders the wisher reviewed |

- **why the fail-open trap counted as non-deferrable:** a nameable harm — any crash in a gate
  permits the very call it guards, in silence. its first build proved the point: `tee /dev/stderr`
  failed where stderr is no device, and `set -e` killed the trap before its `exit 2`. the guarded
  `printf` + `trap '' PIPE` shape (the one check-permissions already carried) holds.
- **rework:** clean — each solved dream is one small change with its own clamp; revert any one alone.
- **confidence:** 85% — the solve/keep line is a judgment; the 10-gate trap reaches past this
  route's own hook, by the wisher's ask.
- **side effects to know:** the fork-budget catalog no longer lists `printf` (a bash builtin, it
  forks naught); `[case23]` stays a wall-clock case (its own dream, `v2026_09_13`), and the rank
  keeps its common path inline so a 500-rule block pays no new call per pattern.
- **verdict:** —
