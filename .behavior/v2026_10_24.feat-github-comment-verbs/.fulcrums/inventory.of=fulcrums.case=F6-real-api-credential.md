# F6 · the real-api case: its target and its credential

- fork: where the "at least one case runs against the real github api in a test repo" runs, and with what token
- facts: `.agent/keyrack.yml` `env.test` declares only `OPENROUTER_API_KEY`; ci's keyrack firewall (`.github/workflows/.test.yml:244`) passes only `env.test` keys, so ci holds no github write token today
- best guess at the time: add the token to `env.test`; target a long-lived pr in `ehmpathy/declastruct-github-demo`; fail loud when absent. rework dirty (human grants). confidence 60%
- **verdict (wisher, 2026-10-24):**
  - keep exactly one real-api case, aimed at a pr in a home-org repo (inside the F4 allowlist)
  - it reads its token through keyrack: owner `ehmpath`, env `test`
  - token absent → fail loud (ConstraintError + keyrack hint), never skip
  - the ci credential is a human grant; the wisher files it as one ask once the case is real. the vision and the drive do not wait on it
- target chosen under the verdict: `ehmpathy/rhachet-roles-ehmpathy#1039`, a closed release pr. the wish's "test repo" clause yields here, and why:
  - `ehmpathy/declastruct-github-demo`, the one home-org test repo found, holds zero prs (`gh pr list --state all` → empty, 2026-10-24)
  - the verbs need a pr (F8), so that repo would need a new pr; the wish bounds the drive to one pr, in this repo
  - the case owns a per-run key, deletes what it posts, and sweeps hour-stale keys, so its trace on #1039 is one short-lived comment on a closed pr
  - to move it is a two-constant edit (`REPO`, `PR`) once a test-repo pr exists
- rework now: clean — the target pr is a test constant
- where: `1.vision.yield.md` .the suite · case=10 · inventory rows 47–48
