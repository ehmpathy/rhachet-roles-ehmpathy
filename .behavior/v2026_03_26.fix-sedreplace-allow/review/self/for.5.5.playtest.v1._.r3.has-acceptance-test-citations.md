# self-review round 1: has-acceptance-test-citations

## objective

cite the acceptance test for each playtest step.

## test file location

**file:** `src/domain.roles/mechanic/inits/claude.hooks/pretooluse.allow-rhx-skills.integration.test.ts`

**note:** this is an integration test, not acceptance test. the hook is tested by simulates of Claude Code's stdin/stdout contract. this IS the acceptance test from Claude Code's perspective.

## citations

### path 1: sedreplace with curly braces

**playtest step:**
```sh
rhx sedreplace --old '{ identity: x }' --new '{ identity: y }' --glob 'src/...'
```

**test citation:**
- file: `pretooluse.allow-rhx-skills.integration.test.ts`
- case: `[case1] P1: rhx with curly braces in single quotes`
- lines: 78-87
- assertion: `expectAllow(result)` verifies `permissionDecision: "allow"`

### path 2: sedreplace with parentheses

**playtest step:**
```sh
rhx sedreplace --old 'foo(bar)' --new 'baz()' --glob 'src/...'
```

**test citation:**
- file: `pretooluse.allow-rhx-skills.integration.test.ts`
- case: `[case2] P2: rhx with parentheses in single quotes`
- lines: 89-98
- assertion: `expectAllow(result)` verifies `permissionDecision: "allow"`

### path 3: grepsafe with pipe in regex

**playtest step:**
```sh
rhx grepsafe --pattern 'onTool|onBoot' --glob 'src/**/*.ts'
```

**test citation:**
- file: `pretooluse.allow-rhx-skills.integration.test.ts`
- case: `[case4] P4: rhx with pipe in regex pattern`
- lines: 111-118
- assertion: `expectAllow(result)` verifies `permissionDecision: "allow"`

### edge 1: rhx with pipe operator

**playtest step:**
```sh
rhx grepsafe --pattern 'foo' | cat
```

**test citation:**
- file: `pretooluse.allow-rhx-skills.integration.test.ts`
- case: `[case6] N1: pipe to external command`
- lines: 131-138
- assertion: `expectPassThrough(result)` verifies empty output (falls through to prompt)

## coverage assessment

| playtest step | test case | covered? |
|---------------|-----------|----------|
| path 1 (curly braces) | case1 | yes |
| path 2 (parentheses) | case2 | yes |
| path 3 (pipe regex) | case4 | yes |
| edge 1 (pipe operator) | case6 | yes |

all playtest steps have matched test citations.

## why integration test is sufficient

the integration test simulates:
1. Claude Code's stdin JSON format
2. the hook's stdout JSON response
3. exit codes

this IS the acceptance contract from Claude Code's perspective. a separate `.acceptance.test.ts` would be redundant.

## why this holds

1. every playtest step has a matched test case
2. test file location and line numbers are cited
3. integration test covers the acceptance contract
4. no gaps require new tests

all playtest steps are verified by automated tests.
