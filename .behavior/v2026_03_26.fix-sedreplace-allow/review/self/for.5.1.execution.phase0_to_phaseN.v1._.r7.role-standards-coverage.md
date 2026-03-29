# self-review round 7: role-standards-coverage

## objective

verify all required mechanic standards are present in the code.

## checklist: required patterns

### hook file

| requirement | present? | evidence |
|-------------|----------|----------|
| shebang line | yes | `#!/usr/bin/env bash` |
| header block | yes | lines 2-26 |
| `.what` field | yes | line 3 |
| `.why` field | yes | lines 5-11 |
| `usage:` section | yes | lines 17-19 |
| `guarantee:` section | yes | lines 21-25 |
| `set -euo pipefail` | yes | line 28 |
| stdin read | yes | line 31 |
| fail-safe error handle | yes | `|| echo ""` pattern |
| early return on invalid | yes | lines 34, 42, 50, 56, 62, 68, 87 |

### test file

| requirement | present? | evidence |
|-------------|----------|----------|
| imports test-fns | yes | line 3 |
| describe block | yes | line 10 |
| given/when/then | yes | all test cases |
| positive cases | yes | cases 1-5 |
| negative cases | yes | cases 6-15 |
| edge cases | yes | cases 16-19 |
| snapshot test | yes | case 22 |
| output validation | yes | expectAllow, expectPassThrough |

### getMechanicRole.ts

| requirement | present? | evidence |
|-------------|----------|----------|
| hook in onTool array | yes | first position |
| timeout specified | yes | `PT5S` |
| filter specified | yes | `{ what: 'Bash', when: 'before' }` |

## checklist: potentially absent patterns

| pattern | relevant? | present? |
|---------|-----------|----------|
| error message with context | no - hook passes through | n/a |
| retry logic | no - hooks are stateless | n/a |
| log output | no - hooks are silent | n/a |
| unit tests | no - hook is integration tested | n/a |

## gaps found

none. all required patterns for a PreToolUse hook are present.

## why this holds

the hook file has:
- complete header documentation
- strict mode enabled
- fail-safe error handle
- linear control flow with early returns

the test file has:
- full test-fns integration
- coverage of all blueprint test cases
- snapshot validation for output format

the role definition has:
- correct hook registration
- proper timeout and filter config
