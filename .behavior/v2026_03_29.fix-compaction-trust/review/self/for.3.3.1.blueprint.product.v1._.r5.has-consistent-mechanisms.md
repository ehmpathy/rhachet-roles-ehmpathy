# self-review r5: has-consistent-mechanisms

## mechanism consistency review

### search: similar briefs

searched for: briefs about verification, trust, claims
- howto.logservation.[lesson].md — diagnosis via logs
- howto.diagnose.[lesson].md — diagnosis techniques
- rule.require.test-covered-repairs.md — test coverage for repairs

**why no duplication:**
- no brief covers "verify inherited claims before you act"
- "trust but verify" is a new lesson from the orphan processes incident
- distinct from diagnosis or test coverage

### search: similar hooks

searched for: postcompact hooks
- sessionstart.notify-permissions.sh — session start, not compaction
- pretooluse.*.sh — tool use, not compaction
- posttooluse.*.sh — tool use, not compaction

**why no duplication:**
- no PostCompact hook exists in codebase
- this will be the first hook for the PostCompact event
- sessionstart is distinct event type

### search: reusable patterns

patterns reused per blueprint decomposition:
| pattern | source | how reused |
|---------|--------|------------|
| brief structure | rule.require.test-covered-repairs.md | sections .what/.why/.the rule |
| hook header | sessionstart.notify-permissions.sh | #!/usr/bin/env bash with .what/.why |
| hook output | sessionstart.notify-permissions.sh | emit to stdout |
| boot.yml | boot.yml | extend say section |
| hooks.jsonc | getMechanicRole.ts | extend PostCompact array |

**why patterns are reused, not duplicated:**
- blueprint cites these patterns in decomposition
- structure follows convention
- functionality is new (PostCompact event, claim verification)

### mechanism review

| mechanism | prior mechanism? | verdict |
|-----------|------------------|---------|
| brief content | no | new lesson |
| brief structure | yes (reused) | consistent |
| hook functionality | no | first PostCompact hook |
| hook structure | yes (reused) | consistent |
| registration | yes (extended) | standard |

## conclusion

no duplicate mechanisms. blueprint reuses patterns and extends registrations.
