# F28 — main's real-test exclusions ride in as main's bytes, unaltered

- **the fork**: `jest.integration.config.ts` excludes four live-service suites from the default run — `git.pull.real`, `git.pull.comment.real` (a github write credential ci lacks) and `set.package.{install,upgrade}.real` (the live npm advisory api, whose count and titles drift). a peer review (5.3, `mech-external-contracts`) reads them as this branch's change and asks that a real external-contract test run in the gate.
  (a) re-add the four suites to the default run in this route; (b) keep main's config byte-for-byte and leave the call with main's owners.
- **taken**: (b).
- **why**:
  - the file is main's, not this branch's: `git diff origin/main -- jest.integration.config.ts` prints no diff. it reads as a change only against this branch's stale merge-base; a rebase onto `origin/main` drops it from the diff
  - this branch took main's bytes for the set.package and parity files to fix six inherited live-api failures (5.3 yield, "the six failures"). to keep main's suites and drop main's config would re-break the same run
  - the exclusion is a decision main made on purpose — the in-file comment names the by-hand command and the credential gap. this route ships briefs and boot specs; none of the four contracts is in its scope
- **rework**: clean — a revert of four config lines, once the owners decide; no code here depends on it.
- **evidence, 2026-11-24**:
  - `git diff origin/main --stat -- jest.integration.config.ts` → empty; `git diff HEAD --stat` → `17 insertions(+)` (the port)
  - main's history of the file: `fdd9dc2b`, `780dd9ff`, `ccb718ae`, `a90ef04e`
  - the set.package suites ride in the same way: `git diff origin/main --stat -- src/domain.roles/mechanic/skills/set.package/` lists only the two `.real` files, which sit on disk untracked (`git status` → `??`), so every set.package test file in this tree is main's bytes. their snapshot coverage (the single-advisory render of `[case2]`) and the live audit in `[case15]` are main's choices, raised again in the 5.3 i002 `ergo-contract-snapshots` round; an edit here would fork main's files and conflict on rebase
  - the by-hand run of the real set.package suites (`npx jest -c jest.integration.config.ts --testMatch …real…`) is not paved for a driver here, so it is not run in this route
- **confidence**: 85%. the residual: the rule asks a real external test in the gate regardless of who wrote the exclusion.
- **where**: `jest.integration.config.ts`; `5.3.verification`, peer review `mech-external-contracts` blocker.1 and `ergo-acceptance-journey-coverage` nitpick.1
- **verdict**: open
