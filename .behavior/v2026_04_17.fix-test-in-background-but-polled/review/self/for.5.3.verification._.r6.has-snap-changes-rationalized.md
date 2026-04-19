# self-review r6: has-snap-changes-rationalized

## snap files in git diff

| file | change type | intended? | rationale |
|------|-------------|-----------|-----------|
| pretooluse.forbid-test-background.integration.test.ts.snap | added | yes | new integration test with snapshot for block message |

## analysis of the new snapshot

### file: pretooluse.forbid-test-background.integration.test.ts.snap

**what it contains:**
```
🛑 BLOCKED: git.repo.test must run in foreground

background + poll wastes tokens (2500+ vs 50 from curated output).
the skill is designed to minimize token consumption - foreground is required.

fix: remove run_in_background from your Bash tool call

instead of:
  Bash(command: 'rhx git.repo.test ...', run_in_background: true)

use:
  Bash(command: 'rhx git.repo.test ...')
```

**why it's intentional:**
1. this is the block message the clone sees when the hook fires
2. it's static content (no timestamps, no ids, no flaky elements)
3. it captures the exact guidance format

**regression check:**
- no prior snapshot to compare (this is new)
- output format is clean and structured
- no accidental content

## common regressions checked

| check | status |
|-------|--------|
| output format degraded | n/a (new) |
| error messages less helpful | n/a (new) |
| timestamps/ids leaked | no - static content |
| extra output unintended | no - exact intended message |

## why it holds

1. **one new snap file.** it's for the new integration test.
2. **content is intentional.** the message is exactly what we want clones to see.
3. **no flaky elements.** no timestamps, ids, or computed values.

## gaps found

none.
