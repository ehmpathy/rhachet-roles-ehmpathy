# self-review: has-play-test-convention (r10)

## question: are journey test files named correctly with `.play.` suffix?

### journey test search in behavior directory

ran: `git ls-files .behavior/v2026_04_04.fix-keyrack/`

result: 57 files listed. zero match `.play.test.ts` pattern.

files listed include:
- `*.md` — documentation
- `*.stone` — route markers
- `*.guard` — guard files
- `*.flag` — bind flags
- `review/self/for.*.md` — self-review files

no test files exist in behavior directory.

### test files modified in this behavior

ran: `git diff main --stat -- '**/*.test.ts'`

result: 12 test files modified.

```
blackbox/guardBorder.onWebfetch.acceptance.test.ts   |   4 +-
keyrack.ehmpath.integration.test.ts                  |  23 +-
git.branch.rebase.take.integration.test.ts           | 324 ++
git.commit.push.integration.test.ts                  |  58 +-
git.commit.set.integration.test.ts                   |  16 +-
git.release.p1.integration.test.ts                   |  14 +-
git.release.p2.integration.test.ts                   |   2 +-
git.release.p3.scenes.on_feat.from_main...           |   2 +-
git.release.p3.scenes.on_feat.into_main...           |   2 +-
git.release.p3.scenes.on_feat.into_prod...           |   2 +-
git.release.p3.scenes.on_main.from_feat...           |   2 +-
git.release.p3.scenes.on_main.into_prod...           |   2 +-
```

### classification of modified tests

| file pattern | count | type | has `.play.`? |
|--------------|-------|------|---------------|
| `*.acceptance.test.ts` | 1 | acceptance | no |
| `*.integration.test.ts` | 11 | integration | no |
| `*.play.test.ts` | 0 | journey | n/a |

none are journey tests. all are either:
- **integration tests** — verify component interactions with real dependencies
- **acceptance tests** — verify contract outputs match specifications

### why no journey tests

per r5, no `3.2.distill.repros.experience.*.md` files exist:
- no user journey repros were captured
- tests derived directly from `criteria.blackbox.md`
- no journey sketches to convert

### convention verification

the guide asks:
1. **are journey tests in the right location?** — no journey tests exist
2. **do they have the `.play.` suffix?** — n/a
3. **if not supported, is fallback convention used?** — n/a (no journeys)

### conclusion

**why it holds:**

1. **zero journey tests in behavior directory** — `git ls-files` shows 57 files, none are tests
2. **zero `.play.` files in modified tests** — `git diff --stat` shows 12 test files, all use standard suffixes
3. **no repros to convert** — r5 documented no repro files exist
4. **requirement vacuously satisfied** — zero journey tests means zero convention violations to fix

