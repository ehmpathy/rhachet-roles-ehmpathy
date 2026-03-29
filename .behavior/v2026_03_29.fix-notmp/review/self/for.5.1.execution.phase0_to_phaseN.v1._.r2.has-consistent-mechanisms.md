# review: has-consistent-mechanisms

## search for extant hooks

found 10 pretooluse hooks in `src/domain.roles/mechanic/inits/claude.hooks/`:
- pretooluse.check-permissions.sh
- pretooluse.forbid-stderr-redirect.sh
- pretooluse.forbid-suspicious-shell-syntax.sh
- pretooluse.forbid-terms.gerunds.sh
- pretooluse.forbid-terms.blocklist.sh
- pretooluse.forbid-planmode.sh
- pretooluse.forbid-tmp-writes.sh (new)

## pattern comparison

compared `pretooluse.forbid-tmp-writes.sh` (113 lines) against `pretooluse.forbid-stderr-redirect.sh` (57 lines):

| element | extant pattern | my implementation | match? |
|---------|---------------|-------------------|--------|
| shebang | `#!/usr/bin/env bash` | same | yes |
| strict mode | `set -euo pipefail` | same | yes |
| stdin read | `STDIN_INPUT=$(cat)` | same | yes |
| failfast empty | `if [[ -z "$STDIN_INPUT" ]]; then exit 2` | same | yes |
| jq extraction | `jq -r '.tool_input.command // empty'` | same pattern | yes |
| block format | stderr + exit 2 | same | yes |
| allow format | exit 0 | same | yes |
| header block | .what/.why/.how/usage/guarantee | same | yes |

## test pattern comparison

found both `.test.sh` and `.integration.test.ts` files:
- older hooks have `.test.sh`
- newer hooks have `.integration.test.ts`

I used `.integration.test.ts` per user guidance and the `rule.require.jest-tests-for-skills` brief.

this is consistent with the newer pattern (`pretooluse.check-permissions.integration.test.ts`, `pretooluse.forbid-suspicious-shell-syntax.integration.test.ts`).

## conclusion

no duplicate mechanisms found. the implementation follows extant patterns exactly.
