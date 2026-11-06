# F36 — chmodsafe holds an integration suite, not an acceptance suite

## .the fork

peer lane r4 (ergo-acceptance-journey-coverage) asks for an `.acceptance.test.ts` for
`chmodsafe`, beside its integration suite.

- (a) keep the integration suite alone: `src/.test/skills.repo.this/chmodsafe.integration.test.ts`
  runs the real `.sh` entrypoint as a subprocess in a temp git repo, with no stub, and snaps each
  path (10 cases)
- (b) add a blackbox suite via `rhachet run --skill chmodsafe`

## .taken, why

(a). chmodsafe lives in `.agent/repo=.this/role=any/skills/`: a skill of this repo for its own
clones, never shipped in the package, so no linked repo can reach it. the blackbox fixture
(`genTestDir`) links the package's roles, which do not hold it, so (b) has no road to run on.
the acceptance rule guards a contract a caller reaches through the shipped package; this one has
no such caller.

## .rework

clean: add a suite under `blackbox/` that runs from this repo's root, if repo-internal skills
gain a blackbox road.

## .confidence

85%: a reviewer may read every new `.sh` as a contract that owes the acceptance grain.

## .where

`.agent/repo=.this/role=any/skills/chmodsafe.sh`; `src/.test/skills.repo.this/chmodsafe.integration.test.ts`.
