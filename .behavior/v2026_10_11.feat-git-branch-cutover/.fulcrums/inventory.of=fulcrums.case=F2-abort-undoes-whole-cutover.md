# F2: abort undoes the whole cutover

- **fork**: abort = return to the source branch, restore the tree, remove the new branch — vs abort
  = stop the in-flight pick only and stay on the new branch with the picks so far.
- **taken**: whole cutover. the caller asked for one atomic move; a half-moved state is the mess the
  verb exists to avoid. the new branch was made seconds earlier by this run and never pushed.
- **rework**: clean — abort's body changes; no later work builds on it.
- **confidence**: 75%. low because it is the one delete in a verb whose bounds stress "never delete";
  a wisher may prefer abort leave the new branch for manual cleanup.
- **where**: q2; case 7; case 9 t4; `.what is awkward?`.
- **verdict**: approved by wisher, 2026-10-12 — "whole cutover"
