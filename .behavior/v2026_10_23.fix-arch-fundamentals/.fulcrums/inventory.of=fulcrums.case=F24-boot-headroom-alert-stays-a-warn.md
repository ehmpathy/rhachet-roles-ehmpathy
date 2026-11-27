# F24 — the boot headroom alert stays a warn; no red floor

- **the fork**: r10 and r11 (i005) found the near-budget alert only in `console.warn` inside a green test, and `rhx git.repo.test` omits the log on success. (a) fail the test below a headroom floor; (b) surface the alert in the runner's summary; (c) keep the warn, and cure the headroom itself upstream.
- **taken**: (c).
- **why**:
  - (a) a red floor fails on the src view today. that view counts ≈ 1,400 tokens of unshipped `.test.ts` files from rhachet's `<also>` roster (`dreams/v2026_11_24.reseed.roles-cost-src-view-lists-unshipped-tests.md`). the linked view, which a consumer boots, sits at 28,587 / 30,000, well under the 98% line. a floor would block every edit on a count no consumer pays
  - (b) the runner is a mechanic skill shared by every repo. a summary channel for test warns is a contract change with its own wish, not a ride-along
  - the hard stop already exists: `assertBootFitsBudget` turns the build red the moment a boot overflows, with the overage and the cure in the error. the alert only moves that news earlier
  - the cure for the headroom itself is caught: `dreams/v2026_10_23.fix.mechanic-boot-runs-at-97-percent.md`
- **evidence, 2026-11-24 (5.3 peer round)**: one new snapshot file, `claude.tools/__snapshots__/teesafe.integration.test.ts.snap`, entered the src `<also>` roster and turned the mechanic src case red at `30,011 / 30,000` (over 11); the linked view stayed at 28,587. the red error led with the src-view note, as designed. cured by a cut of one restated example from `rule.forbid.io-as-domain-objects.md.min` → src `29,953`, linked `28,529`. each test file added under a mechanic skill dir now spends src headroom no consumer pays, so the upstream fix grows more urgent with every test
- **rework**: clean — a floor is one `if` in the test once the src view drops the unshipped roster.
- **confidence**: 75%. the residual: a reviewer may judge the late red cheaper than a summary channel, and want (a) on the linked view alone.
- **where**: `src/domain.roles/boot.budget.integration.test.ts` (`asBootHeadroomAlert`); `5.1.execution.from_vision` review i005, r10 blocker.1 and r11 nitpick.4
- **verdict**: ruled by the wisher, 2026-11-27 — the warn is fine; no floor
