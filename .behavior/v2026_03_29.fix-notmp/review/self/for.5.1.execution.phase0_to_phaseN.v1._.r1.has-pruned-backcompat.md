# review: has-pruned-backcompat

## summary

no backwards compatibility concerns in this change. all components are new additions.

## review

| component | backwards compat concern? | notes |
|-----------|--------------------------|-------|
| `pretooluse.forbid-tmp-writes.sh` | no | new file |
| `pretooluse.forbid-tmp-writes.integration.test.ts` | no | new file |
| hook registration in getMechanicRole.ts | no | additive change |
| settings.json hook entry | no | additive change |
| briefs | no | new files |

## why it holds

- this behavior is entirely new - it adds a guardrail that did not exist before
- no extant workflows are modified
- writes to /tmp/* that were previously allowed are now blocked (intentional behavior change, not backwards compat)
- reads from /tmp/claude* were already allowed via extant `Bash(cat:*)` etc rules
- no shims, fallbacks, or deprecation paths needed
