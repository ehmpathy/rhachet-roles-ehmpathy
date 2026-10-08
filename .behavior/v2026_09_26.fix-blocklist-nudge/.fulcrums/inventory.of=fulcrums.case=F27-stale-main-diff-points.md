# F27 — three i010 points read code this route never wrote (the reviewer diffed a stale local main)

- **fork:** change the three files the i010 arch-defects lane named, or hold them as out of scope.
- **taken:** hold them. the lane diffed against local `main` (v1.37.7), not `origin/main` (v1.39.3).
  each file it named sits on `origin/main` already, unchanged by this branch:
  - `asResolvedToolPaths.ts`, `asMalformedHookPaths.ts`, `asWriteJson.ts` — all three arrived in
    `79282ddf fix(hooks): … (#792)`, already merged (`git log origin/main -- <file>`)
  - `pretooluse.forbid-shouted-readme.integration.test.ts` — `git diff origin/main` shows only
    *deletions*: `origin/main` moved ahead with newer tests in this file; this branch never
    edited it
  each point (an `as*` that does i/o, an unescaped role in a regex, a test that inlines its
  payload) is fair on its own, and belongs to a change against the code that owns it.
- **rework:** clean — each is a small edit in its own change.
- **confidence:** 90% — the commit and diff evidence is checkable.
- **where:** `src/domain.roles/mechanic/inits/claude.hooks/` (the three `as*.ts` files, the
  shouted-readme suite).
- **verdict:** —
