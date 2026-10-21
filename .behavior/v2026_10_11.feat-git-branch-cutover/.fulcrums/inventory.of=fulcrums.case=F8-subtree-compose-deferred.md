# F8: cutover stays its own verb; a `--into <subtree>` composition with git.tree.subtree is deferred

- **the fork**: (a) drop cutover, since the peer task #918 (`git.tree.subtree`) also yields a fresh
  tree; (b) keep cutover as a standalone verb, compose with subtree later via `--into`; (c) build
  the subtree composition now
- **taken**: (b). #918 cuts a parallel tree off the parent's head, so the stale history rides
  along — the exact defect cutover exists to escape. cutover cuts from `origin/main` and replays
  only the named commits. the two compose, they do not overlap
- **rework**: clean — `--into` is an additive flag; no extant contract changes
- **confidence**: 75% — #918's final shape is not yet settled; if it gains a `--from origin/main`
  base, the overlap grows
- **where**: `1.vision.yield.md` q12
- **verdict**: settled by wisher, 2026-10-14 — "the point of a cutover is to cutover to a new branch within the current tree … otherwise, its a subtree, not a branch cutover, which is a different feature." cutover takes no subtree placement, now or later. `--into` is the new branch name (F10)
