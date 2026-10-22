# F30 — the github contract is proven by real calls with no credential; authenticated gh stays faked

## .the fork

- **A (taken)** — each suite that drives gh fakes it, with a `.mock`/`.why`/`.real` note; the
  real github is called in `git.commit/external.contracts.integration.test.ts` (real gh with no
  credential, matched by `is_gh_auth_failure`; real keyrack absent-key; real `git ls-remote`) and in
  `git.repo.get` `[case7][t1]` (real gh with no credential, rendered as `gh is not logged in`)
- **B** — an authenticated real-call suite against a sandbox repo: open, view, merge, rerun a pr

## .taken, and why

A. B needs two things this pr cannot grant itself:

1. a github credential in the test keyrack. `.agent/keyrack.yml` `env.test` holds only
   `OPENROUTER_API_KEY`; the seaturtle token lives in `env.prep`, and a narrow-unlock rule keeps
   test runs off prep keys
2. a sandbox repo whose prs a test may merge. `git.release --mode apply` merges and tags; against
   a real repo a test run ships. that is the harm the release meter exists to prevent

the rule's floor — one real call per external contract, with at least the lack-of-creds case — is
met for github, keyrack, and the git remote. the fakes stand in only for states the real service
cannot be driven into on demand with no credential (a green check, a merge conflict, a rerun).

## .rework

dirty — B needs a ci secret, a sandbox repo, and a cleanup harness; the release suites would then
split between real and fake scenes.

## .confidence

75% — the floor is met, but an authenticated read (`gh pr view --json` field names) is not proven
live; a gh field rename would pass every fake. the gap is named for the council.

## .where

- `src/domain.roles/mechanic/skills/git.commit/external.contracts.integration.test.ts`
- `src/domain.roles/mechanic/skills/git.release/.test/infra/mockGh.ts` (the exception contract)
- `src/domain.roles/mechanic/skills/git.repo.get/git.repo.get.integration.test.ts` `[case7]`

## .verdict

open — for the fulcrum council.
