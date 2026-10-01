# F18 — the real services are called without a credential; the authenticated path waits on a ci secret

## the fork

- **A (taken)** — add one real-call suite that needs no credential, so it runs on every host and in
  ci: the real gh's no-credential refusal (run through `is_gh_auth_failure`), the real keyrack's
  absent-key refusal, and a public read of the real git remote. point every fake's `.real` at it
- **B** — also add an authenticated real call (a real pr list under the seaturtle token)

## taken, and why

- **the rule's floor is met for real**: `external.contracts.integration.test.ts` calls the live gh,
  keyrack, and git remote, and checks each answer against what the skills parse — the lack-of-creds
  case the rule names as the minimum
- **it closes a real gap the fakes could not**: `is_gh_auth_failure` gates the pr-open guide on gh's
  freeform text; its own note said "there is no structural backstop" against a gh reword. the suite
  runs the matcher on the text gh emits today, so a reword goes red
- **B needs a grant i cannot make**: the seaturtle token (`EHMPATHY_SEATURTLE_GITHUB_TOKEN`) lives in
  `env.prep`; ci unlocks `env.test` only (`.github/workflows/.test.yml`, keyrack firewall
  `--env test`). a test that reads it would fail in ci until a human adds the secret to the test env
- the deleted `@me` → `gh api user` test was not restored: the wish removed that call (both
  `mech-external-contracts` and `ergo-contract-snapshots` concede this)

## rework

clean for A (one new suite, one function lifted to the keyrack leaf). B is dirty: a ci secret, a
keyrack.yml change, and a decision on which account a test may act as.

## confidence — 85%, and why

the lack-of-creds case is what the rule names as the minimum; a reviewer may still ask for the
authenticated path, which is the wisher's grant to give.

## the deferral

dream: `.dream/v2026_09_30.fix.git-release-and-push-lack-a-real-github-test.md` — narrowed to the
authenticated path.

## where

`src/domain.roles/mechanic/skills/git.commit/external.contracts.integration.test.ts`; `.real` fields
in `mockGh.ts`, `git.commit.push.integration.test.ts`, `git.commit.set.integration.test.ts`,
`keyrack.operations.integration.test.ts`.

## verdict

(awaits the council)
