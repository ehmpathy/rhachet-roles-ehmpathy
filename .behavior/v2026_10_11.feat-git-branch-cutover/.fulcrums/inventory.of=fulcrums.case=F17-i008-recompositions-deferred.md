# F17: the i008 recompositions defer to the dream, not this diff

- **the fork**: (a) land the i008 r011 recompositions in this route: the op-in-flight leaf (n4),
  the errexit convention + shellcheck (n5), the operations and test-file split (n6), and the
  push-allowed probe (n3). (b) catch them as dream items 5–8, and land only the defects
- **taken**: (b). n3 and n4 ripple into the commit and rebase skills, which this route only reads
  (F11, F13). n5 and n6 rewrite whole files, a refactor smuggled into a feat diff. the reviewer
  graded all four "safe to defer". every defect it raised (resume, untracked guard, renames) is fixed
- **rework**: dirty — each touches files outside this skill or rewrites its two largest files; a
  later branch lands them against a stable, tested surface
- **confidence**: 85% — the reviewer's own "do first" list stops at findings 1–3; a wisher may still
  want the operations split (n6) before #531 cutback reuses the park
- **where**: `src/domain.roles/mechanic/skills/git.branch.cutover/`, `git.branch.rebase/`, `git.commit/`
- **dream**: `dreams/2026_10_21.fix-cutover-position-table-and-shared-leaves.dream.md`, items 5–8
- **verdict**: —
