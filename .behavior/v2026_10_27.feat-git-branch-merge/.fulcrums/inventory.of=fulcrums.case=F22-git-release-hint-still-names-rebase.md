# F22 — git.release still hints rebase for a CONFLICTING pr

- **fork**: (a) repoint the `needs rebase now, has conflicts` hint at `rhx git.branch.catchup begin` in this PR; (b) leave git.release as is here, catch a dream, and hand the call to the commander
- **taken**: (b). the hint lives in four sites outside this verb (`git.release._.emit_transport_watch.sh:198`, `git.release/output.sh:182`, `git.release.spec.md:223`, `commands.alternatives.jsonc:85`) plus the rebase success line (`git.branch.rebase.begin.sh:255`). which verb a pushed branch should reach for changes what git.release says to every clone, and the rebase twin's debt stays out of this PR (F14, seed S6). a release-output change is the commander's to rule
- **rework**: clean. a one-line hint swap per site plus its snapshots; no caller hardened against it
- **risk**: medium. until the hint moves, a clone with a CONFLICTING pr follows the rebase hint into the force wall that started #1021
- **confidence**: 80%. the fix is small and the wish names the outcome; the doubt is whether the commander wants it inside this PR or as its own
- **where**: i005 r010 blocker.1
- **dream**: `.dream/v2026_10_30.fix.git-release-hint-names-catchup.md`
- **verdict**: taken by the driver: an execution fork (seeds S6, S7). it changes another verb's hint text, not what catchup does or how it decomposes; C4's one task, one tree settles it in kind, and the rebase success line is the rebase twin's debt C4 names outright
