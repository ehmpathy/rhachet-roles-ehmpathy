# rule.forbid.real-identities-in-fixtures

## .what

test code, fixtures, and snapshots must never carry a real person's name, email, or other
identifying detail — including the author's own. use a plainly fake placeholder instead.

## .why

- test files, snapshots, and `.log/` artifacts are committed and pushed. a real email in a
  fixture ships to every clone of the repo and every fork, forever — `git log`/`git blame`
  cannot un-ship it once it lands on a remote
- a real address in a snapshot invites scraping and spam, for zero test value: the suite does
  not care whose name it renders, only that a name renders
- authors reach for their own identity as the path of least resistance when a case needs "a
  real-looking human" — that habit is the exact failure mode this rule targets

## .the test

before you type a name/email into test code, ask: **"is this string a real person's identity,
or an obviously fake placeholder?"**

- a fake placeholder (`Test Human`, `Jamie Rivera`, `human@test.com`, `jamie@example.com`) → fine
- your own name/email, a colleague's, or any real individual's → forbidden, even as an example

## .how

- reuse the extant placeholder a suite already seeds (e.g. `seedTestSponsor`'s default
  `Test Human` / `human@test.com`) rather than inventing a new one
- when a case needs a SECOND distinct identity, use another obviously fake name — never reach
  for a real one because it is "just an example" or "just in a comment"
- `@example.com` (rfc 2606) is the reserved domain for exactly this; prefer it for any new email
  a fixture introduces

## .examples

### 👎 bad — a real identity in a clamp

```ts
sponsor: { name: 'Ulad Kasach', email: 'uladkasach@gmail.com' },
```

### 👍 good — an obviously fake identity

```ts
sponsor: { name: 'Jamie Rivera', email: 'jamie@example.com' },
```

## .enforcement

- a real person's name or email in test code, a fixture, or a snapshot = **blocker**
- a new fixture identity that reaches for a personal domain instead of `@example.com` = **nitpick**

## .see also

- `rule.require.hermetic-tests` — the neighboring family of rules on what a test may carry
- `code.prod/readable.comments/rule.require.timeless-comments` — a comment/fixture must stand
  on its own, with nothing it should not durably carry
