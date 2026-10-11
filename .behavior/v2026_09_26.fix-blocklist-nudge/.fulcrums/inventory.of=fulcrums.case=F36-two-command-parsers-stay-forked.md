# F36 — the gate and the decider keep their own command parsers

## .the fork

- **unify now:** one shared parse/match lib for `pretooluse.check-permissions.sh`
  (`split_compound_command`, `command_is_allowed`) and `permissionrequest.decide-permissions.sh`
  (`compute_command_scan`, `tokenize_argv`, `canonicalize_rhx_command`, its own allow/deny match)
- **hold:** keep both; record the fork, its risk, and the shape of the merge

raised by peer review i007 (enroll-impl-arch-defects, blocker.1, graded `urgent`).

## .taken — hold, and why at the time

- the decider predates this route; the route touched it only for the zero-fork `.claude` walk
- the two answer different questions: the gate asks "is every part paved, and if not, what fits?";
  the decider asks "may this prompt be auto-allowed, auto-denied, or lifted to a human?", with a
  deny list, rhx canonicalization, and per-segment sink rules the gate has no use for. a shared
  parser must serve both contracts — a redesign, not a lift
- the order bounds the harm: the gate runs first; a part it blocks never reaches the decider. a
  parse drift between them can only make the decider stricter or looser on a command the gate
  already paved

## .rework

**dirty** — both hooks' suites (~240 decider cases, ~240 gate cases) pin each parser's output;
a merge re-pins both.

## .confidence — 70%, and why it is low

the reviewer cites the decider's own comments on a past bypass class from this exact fork; the
risk is real, only when to pay it down is the judgment.

## .where

`.dream/v2026_10_07.feat.one-shared-parser-and-ranker-for-the-permission-gates.md`

## .verdict

open
