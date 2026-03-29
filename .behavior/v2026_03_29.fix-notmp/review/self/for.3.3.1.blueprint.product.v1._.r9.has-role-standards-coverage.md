# self-review r9: has-role-standards-coverage

## method

coverage review asks: are all relevant mechanic standards applied?
adherance review (r8, r9) asked: is what's there correct?

this review checks for omissions — patterns that should be present but absent.

---

## relevant rule categories

the blueprint involves a bash hook. relevant standards:

1. `code.prod/pitofsuccess.errors` — error handle patterns
2. `code.prod/readable.comments` — documentation patterns
3. `code.test` — test coverage patterns
4. `lang.terms` — naming patterns
5. `work.flow/release` — commit patterns

---

## coverage check 1: error handle patterns

### what should be present

for a PreToolUse hook:
- empty stdin handling ✓ blueprint has this
- malformed JSON handling — implicit via jq + set -e
- stderr output for blocks ✓ blueprint has guidance message

**coverage evaluation:**

| pattern | present? | notes |
|---------|----------|-------|
| fail-fast on empty | ✓ yes | exit 2 |
| propagate jq errors | ✓ implicit | set -e + jq |
| stderr for blocks | ✓ yes | guidance message |

**why coverage is complete:**
all error paths are handled. no silent failures possible.

---

## coverage check 2: documentation patterns

### what should be present

for a bash hook:
- `.what` header
- `.why` header
- `usage:` section
- `guarantee:` section

**blueprint says:**
```
├─ [+] read stdin JSON
│  └─ [←] reuse pattern from pretooluse.forbid-terms.gerunds.sh
```

**coverage evaluation:**

blueprint references extant pattern. extant hooks have:
```bash
######################################################################
# .what = ...
# .why  = ...
# usage: ...
# guarantee: ...
######################################################################
```

**why coverage is complete:**
blueprint explicitly reuses extant pattern which includes all required sections.

---

## coverage check 3: test coverage patterns

### what should be present

for a hook:
- test file exists
- all code paths tested
- block cases tested
- allow cases tested
- edge cases tested

**blueprint test plan:**
```
pretooluse.forbid-tmp-writes.test.sh
├─ [←] reuse test structure
├─ [+] test: Write to /tmp/* blocks
├─ [+] test: Write to /tmp/claude* blocks
├─ [+] test: Write to .temp/* allows
├─ [+] test: Edit to /tmp/* blocks
├─ [+] test: Bash > /tmp/* blocks
├─ [+] test: Bash tee /tmp/* blocks
├─ [+] test: Bash cp to /tmp/* blocks
├─ [+] test: Bash mv to /tmp/* blocks
├─ [+] test: Bash > .temp/* allows
├─ [+] test: Bash cat /tmp/claude* allows
├─ [+] test: guidance message contains .temp/
└─ [+] test: empty stdin exits 2
```

**coverage evaluation:**

| code path | test present? |
|-----------|---------------|
| Write block | ✓ yes |
| Edit block | ✓ yes |
| Bash redirect block | ✓ yes |
| Bash tee block | ✓ yes |
| Bash cp block | ✓ yes |
| Bash mv block | ✓ yes |
| .temp/ allow | ✓ yes |
| Bash read allow | ✓ yes |
| empty stdin | ✓ yes |
| guidance content | ✓ yes |

**why coverage is complete:**
every documented code path has a test.
block paths, allow paths, and error paths all covered.

---

## coverage check 4: naming patterns

### what should be present

for a hook:
- hook name follows `pretooluse.{action}.sh` pattern
- test name follows `pretooluse.{action}.test.sh` pattern
- UPPER_SNAKE_CASE for variables

**blueprint:**
- `pretooluse.forbid-tmp-writes.sh` ✓
- `pretooluse.forbid-tmp-writes.test.sh` ✓
- variables: implicit via pattern reuse

**why coverage is complete:**
naming patterns follow extant conventions.

---

## coverage check 5: release patterns

### what should be present

for a new hook:
- hook registered in role definition
- permissions updated

**blueprint:**
```
getMechanicRole.ts
└─ [~] update: register new hook

init.claude.permissions.jsonc
└─ [~] update: add Bash read permissions for /tmp/claude*
```

**coverage evaluation:**

| artifact | update present? |
|----------|-----------------|
| role definition | ✓ yes |
| permissions | ✓ yes |

**why coverage is complete:**
all integration points documented.

---

## potential omission check

### is anything missing?

**checklist:**
- [ ] hook registration — ✓ present
- [ ] permission updates — ✓ present
- [ ] test file — ✓ present
- [ ] header documentation — ✓ via pattern reuse
- [ ] error handle — ✓ present
- [ ] guidance message — ✓ present

**what about validation tests?**

the blueprint doesn't specify:
- test for malformed JSON input

**is this a gap?**

malformed JSON handling is implicit:
- `set -e` causes hook to exit on any error
- jq exits non-zero on malformed JSON
- result: hook exits with jq's exit code

**should there be an explicit test?**

checking extant hooks... extant hooks don't have malformed JSON tests.
this is acceptable — jq behavior is well-known.

**why it's not a gap:**
implicit handling via jq is sufficient.
no need to test jq's behavior.

---

## summary

| coverage area | status |
|---------------|--------|
| error handle | ✓ complete |
| documentation | ✓ complete |
| test coverage | ✓ complete |
| naming patterns | ✓ complete |
| release artifacts | ✓ complete |

**no omissions found.**

all relevant mechanic standards are applied in the blueprint.
