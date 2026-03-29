# self-review r8: has-critical-paths-frictionless

## question

are the critical paths frictionless in practice?

## analysis

### critical paths identified

| path | description | friction level |
|------|-------------|----------------|
| brief load | brief is booted with mechanic role | **none** — automatic |
| hook fire | hook fires after compaction | **none** — automatic |

### path 1: brief load

**how it works:**
1. mechanic role boots at session start
2. boot.yml includes `briefs/practices/work.flow/rule.require.trust-but-verify.md`
3. brief content is loaded into context

**friction check:**
- no user action required
- no configuration needed
- brief is always present when mechanic role is active

**result:** frictionless ✓

### path 2: hook fire

**how it works:**
1. compaction occurs (auto or manual)
2. Claude Code fires `PostCompact` event
3. rhachet executes `postcompact.trust-but-verify.sh`
4. hook emits reminder to stdout
5. mechanic sees reminder before next response

**friction check:**
- no user action required
- hook is registered via `getMechanicRole.ts`
- filter ensures hook fires only on PostCompact events

**result:** frictionless ✓

### repros artifact check

no repros artifact exists (behavior is preventive, not reactive). critical paths derived from wish:
- wish says "brief exists and is booted with mechanic role" — covered by path 1
- wish says "sessionstart hook warns on compaction resume" — covered by path 2

## why it holds

both critical paths are automatic — they require no user action. the brief loads at session start via boot.yml, and the hook fires after compaction via the PostCompact event filter. the mechanic experiences zero friction because the verification reminder appears automatically.

