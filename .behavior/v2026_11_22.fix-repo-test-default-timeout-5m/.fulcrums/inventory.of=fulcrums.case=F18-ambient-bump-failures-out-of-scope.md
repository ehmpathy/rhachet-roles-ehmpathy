# F18: the two failures the ambient rhachet bump causes stay out of this wish

- fork: repair `getMechanicRole.hooks-reachable` and depcheck here, or leave them with the uncommitted bump that causes them
- taken: leave. both fail only on the local tree: the uncommitted `package.json` / `pnpm-lock.yaml` bump (rhachet 1.51 → 1.54, three new role devDependencies) regenerated `.claude/settings.of.repo.json` into one hook dispatcher and added the three packages depcheck flags. this wish stages neither file (yield `.stage list`), so the committed tree keeps the prior settings and deps. to fix them here would ship someone else's upgrade under this wish's name
- proof owed: CI on the pushed branch, which runs the committed tree; a red CI on either reopens this fulcrum
- rework: dirty for this wish (the upgrade's own route owns it), clean for that route
- confidence: 85%
- where: `src/domain.roles/mechanic/getMechanicRole.hooks-reachable.integration.test.ts`; `.depcheckrc.yml`
- verdict: open, awaits CI
