# F7: push's integration suite keeps its fakes; the real-contract suite is where `.real` points

- **fork**: the 5.3 `mech-external-contracts` lane rejects `git.commit.push.integration.test.ts` for faked `gh`, `git push`, and keyrack boundaries, and asks for a real gh pr-open and real git push test. add one in this pr, or hold the extant design
- **taken**: hold it. the design already meets `rule.require.external-contract-integration-tests`, one file over:
  - push's suite header carries `.mock` / `.why` / `.real` (`git.commit.push.integration.test.ts:13-29`); `.real` names `external.contracts.integration.test.ts`
  - that suite calls each service for real: `[case1]` the real `gh` cli with no credential (the lack-of-credential refusal the rule names as the minimum), `[case2]` the real keyrack asked for an absent key, `[case3]` the real git remote in a public read. `rhx git.repo.test --what integration --mode apply --scope 'path://git.commit/external.contracts'` → `8 passed, 0 failed, 0 skipped`
  - the edit verbs this change points to have their own real-api case: `git.pull/git.pull.real.integration.test.ts`
  - the lane saw neither file because its scope is the `since-main` diff; both predate this change and are unchanged by it
- **why not add a real pr-open here**: a real `gh pr create` and `git push` write to github on every run, and need the seaturtle token, which is absent on this machine (`rhx keyrack unlock … --key EHMPATHY_SEATURTLE_GITHUB_TOKEN` → `status: absent`). this change adds seven help lines; it changes no call to `gh` or `git`
- **rework**: clean — a real-write case could land in its own pr against a sandbox repo
- **confidence**: 90% — the `.real` chain is explicit and green; the 10% is whether the rule wants a real *write*, beyond the no-credential refusal it names as the minimum
- **where**: 5.3 peer round i001, r3 blocker.1
- **verdict**: settled by the driver (S2 handed it over): stands. the 5.3 `mech-external-contracts` lane approved on round i002 with this record in view
