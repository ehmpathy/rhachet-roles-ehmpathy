# self-review round 6: role-standards-adherance

## objective

verify code follows mechanic role standards.

## briefs directories to check

| directory | relevant rules | applies to |
|-----------|----------------|------------|
| lang.terms | ubiqlang, treestruct, gerunds | all names |
| lang.tones | lowercase, chill emojis, seaturtle | comments, output |
| code.prod | fail-fast, arrows-only, what-why headers | shell and ts code |
| code.test | given-when-then, snapshots | test file |

## check: lang.terms

### rule.require.ubiqlang

| term | consistency | status |
|------|-------------|--------|
| `STDIN_INPUT` | matches extant hooks | ok |
| `TOOL_NAME` | matches extant hooks | ok |
| `CMD` | similar to extant `COMMAND` | ok |
| `CMD_STRIPPED` | clear meaning | ok |
| `buildStdinJson` | describes function | ok |
| `runHook` | describes function | ok |
| `expectAllow` | describes assertion | ok |
| `expectPassThrough` | describes assertion | ok |

### rule.forbid.gerunds

| check | found | status |
|-------|-------|--------|
| hook file | no gerunds | ok |
| test file | no gerunds | ok |

### rule.require.treestruct

| name | pattern | status |
|------|---------|--------|
| file: pretooluse.allow-rhx-skills | event.verb-target | ok |
| file: pretooluse.allow-rhx-skills.integration.test | hookname.type.test | ok |

## check: lang.tones

### rule.prefer.lowercase

| location | check | status |
|----------|-------|--------|
| hook comments | lowercase | ok |
| hook header | `.what`, `.why`, `.how` lowercase | ok |
| test descriptions | lowercase in given/when/then | ok |

### rule.prefer.chill-nature-emojis

| location | emojis used | appropriate? |
|----------|-------------|--------------|
| hook file | none | ok (shell executable) |
| test file | none | ok (test code) |

## check: code.prod

### rule.require.what-why-headers

| file | header | status |
|------|--------|--------|
| hook | `.what`, `.why`, `.how`, `usage`, `guarantee` | ok |

### rule.require.fail-fast

| location | fail behavior | status |
|----------|---------------|--------|
| empty stdin | exit 0 (pass-through, fail-safe) | ok |
| not Bash | exit 0 (pass-through) | ok |
| empty command | exit 0 (pass-through) | ok |
| non-rhx | exit 0 (pass-through) | ok |

### rule.forbid.else-branches

| file | else usage | status |
|------|------------|--------|
| hook | no else, uses early exit | ok |

## check: code.test

### rule.require.given-when-then

| test file | structure | status |
|-----------|-----------|--------|
| integration test | uses `given`, `when`, `then` from test-fns | ok |

### rule.require.snapshots

| test | snapshot usage | status |
|------|----------------|--------|
| case 22: output structure | uses `toMatchSnapshot()` | ok |

## violations found

none. all mechanic standards followed.

## why this holds

- names follow ubiqlang (consistent with extant)
- no gerunds in code
- file names follow treestruct
- comments and headers are lowercase
- fail-fast via early returns (no else branches)
- tests use given/when/then
- output validated via snapshot
