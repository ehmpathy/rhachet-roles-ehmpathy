# F7: report per-branch state, never carry it

- **fork**: when the old branch has per-branch state in peer skills — a route bind (a flag named for
  the branch under `$route/.bind/`), an inferred commit level — cutover could (a) rewrite it for the
  new branch, (b) report it with the exact command to rebind, or (c) ignore it.
- **taken**: (b). (a) reaches into bhrain's route state and the mechanic's bind files from a git
  verb — a boundary leak, and a silent move of a human-prescribed constraint. (c) leaves a mechanic
  mid-route with no bound route and no clue why. a report line costs one row and keeps each skill
  the sole writer of its own state.
- **rework**: clean — a later version can add a `--carry-route` opt-in without a contract break.
- **confidence**: 70%. the wisher may prefer the route bind follow the work automatically, since a
  cutover mid-route is exactly when the route matters most.
- **where**: yield step 5; assumptions a4, a7; inventory `.seams`.
- **verdict**: overruled by wisher, 2026-10-12 — "ignore it". cutover neither writes nor reports the route bind; the commit level is still reported
