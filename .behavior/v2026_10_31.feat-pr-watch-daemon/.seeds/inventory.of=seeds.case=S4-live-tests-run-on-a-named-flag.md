# S4 · live tests run only on a named flag

## .said

> director: the key ask is not the path. live tests run only when a named flag targets them (commander 2026-10-31, three tiers): ci must go green with no new credential. outcome owed: #1222 green in ci, with the real-github etag case run only when its named flag is set and loud on an absent key when named, as rhachet-roles-nheuron #4 did with TEST_LIVE. then clear 5.3 and land the done gate: commit, push, git.release --watch green. quota 2, push allowed, granted now. never merge or --apply. reply with your hour.

## .settled

- no key fill: ci goes green with no new credential
- the real-github etag case runs only when its named flag is set (precedent: rhachet-roles-nheuron #4, `TEST_LIVE`)
- named and the key absent → it fails loud
- then 5.3 clears and the done gate lands: commit, push, `git.release --watch` green
- quota 2, push allowed; never merge, never `--apply`

## .landed

| where | what |
|---|---|
| `git.pull.watch.github.real.integration.test.ts` | gated on the named flag |
| `blocker/5.3.verification.md` | closed by this seed |
| the done-gate commit + push | on #1222 |
