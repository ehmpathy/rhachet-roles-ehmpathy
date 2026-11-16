# F24 — one body per begin mutation gate, and a plan with no identity fetch, deferred

- **fork**: (a) reshape begin's plan and apply around one record per gate, and drop the plan's token fetch, in this PR; (b) keep the paired blocks, each clamped, and catch the reshape as a dream
- **taken**: (b). the paired blocks agree today, and a test pins each. the plan identity fetch is shared with `git.commit.set` plan, so its fix spans both verbs. the reshape changes no behavior a clone sees
- **rework**: clean. the dream holds the shape; no caller depends on the paired blocks
- **risk**: low. a new gate added later could drift between plan and apply until the reshape lands
- **confidence**: 80%
- **where**: i006 r011 nitpick.1 and nitpick.7
- **dream**: `.dream/v2026_10_30.refactor.catchup-gate-bodies-and-plan-render.md`
- **verdict**: taken by the driver
