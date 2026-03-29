# self-review r10: has-role-standards-coverage

## mechanic role standards coverage review

this review checks the inverse of r9: are there standards that should be present but are absent? did we forget required practices?

### rule directories enumerated

**enumeration method:** checked all 29 directories from tree output

**relevant for coverage checks:**
| directory | why relevant | standards to check |
|-----------|--------------|-------------------|
| `code.test/` | test coverage | rule.require.test-covered-repairs |
| `code.prod/pitofsuccess.errors/` | error handle | rule.require.fail-fast |
| `code.prod/pitofsuccess.typedefs/` | validation | rule.require.shapefit |
| `code.prod/readable.comments/` | documentation | rule.require.what-why-headers |

**checklist from guide:**
- [ ] error handle — check if blueprint needs it
- [ ] validation — check if blueprint needs it
- [ ] tests — check if blueprint plans it
- [ ] types — check if blueprint defines types (n/a for bash/markdown)
- [ ] other required practices — check registration, documentation

---

### coverage check 1: test coverage

**standard:** rule.require.test-covered-repairs — every change must have tests

**blueprint test coverage section:**
```
## test coverage

### brief tests

| test type | scope | coverage |
|-----------|-------|----------|
| integration | boot.yml | brief appears in boot output |

### hook tests

| test type | scope | coverage |
|-----------|-------|----------|
| integration | hook execution | emits reminder to stdout and exits 0 |
```

**verdict:** [OK] test coverage planned

**why it holds:**
- brief test: verifies brief is booted (integration test with boot.yml)
- hook test: verifies hook emits correct output and exits 0
- execution phases include "phase 2: tests" and "phase 3: verification"
- blueprint explicitly plans test coverage, not just implementation

**blueprint lines examined:**
- lines 127-136: test coverage section with tables
- lines 155-174: execution phases including test phase

**checklist item:** [x] tests — planned in blueprint

---

### coverage check 2: error handle

**standard:** rule.require.fail-fast — handle errors with clear failure

**blueprint hook contract reviewed:**
- hook is informational (emits text)
- hook has no failure modes (just `cat` and `exit 0`)
- hook cannot fail in normal operation

**verdict:** [OK] no error handle needed

**why it holds:**
- `cat << 'EOF'` is deterministic — cannot fail
- `exit 0` is deterministic — cannot fail
- no external dependencies (no files to read, no APIs to call)
- compare to `sessionstart.notify-permissions.sh` which needs error handle for file reads
- this hook is pure output, no error paths exist

**blueprint lines examined:**
- lines 99-121: hook contract with `cat << 'EOF'` and `exit 0`
- no file operations, no conditionals, no external calls

**checklist item:** [x] error handle — not needed (no failure modes)

---

### coverage check 3: validation

**standard:** rule.require.shapefit — validate inputs

**blueprint artifacts reviewed:**
- brief: markdown file, no runtime input
- hook: no stdin parse in contract

**verdict:** [OK] no validation needed

**why it holds:**
- brief is static content, no inputs
- hook emits static text, does not parse stdin
- compare to `pretooluse.*.sh` hooks which validate tool input — those need validation
- this hook is fire-and-forget informational output

**blueprint lines examined:**
- lines 99-121: hook contract — no `jq`, no `STDIN_INPUT=$(cat)`, no parse operations
- hook codepath (lines 49-56): emit reminder, exit 0 — no input process

**checklist item:** [x] validation — not needed (no inputs to validate)

---

### coverage check 4: types

**standard:** rule.require.shapefit — types must fit

**blueprint artifacts reviewed:**
- brief: markdown file — no TypeScript types
- hook: bash executable — no TypeScript types

**verdict:** [OK] types n/a

**why it holds:**
- brief is pure markdown documentation — no runtime types
- hook is pure bash — no TypeScript types
- compare to domain operations which need type definitions
- these artifacts are text/shell, not TypeScript code

**blueprint lines examined:**
- entire blueprint: no .ts files planned, only .md and .sh

**checklist item:** [x] types — not applicable (no TypeScript)

---

### coverage check 5: registration

**standard:** hook must be registered to fire

**blueprint registration section:**
```
### registration codepath

rhachet roles init
  ├── [~] boot.yml
  │   └── always.briefs.say += rule.require.trust-but-verify.md
  └── [~] inits/getMechanicRole.ts
      └── hooks.PostCompact += postcompact.trust-but-verify
```

**verdict:** [OK] registration planned

**why it holds:**
- brief registration: add to `always.briefs.say` in boot.yml
- hook registration: add to `hooks.PostCompact` array in getMechanicRole.ts
- both registrations are explicitly documented in blueprint
- execution phases include registration steps

**blueprint lines examined:**
- lines 58-66: registration codepath with explicit paths
- lines 26-29: filediff tree shows boot.yml and getMechanicRole.ts modifications

**checklist item:** [x] other required practices — registration planned

---

### coverage check 6: documentation

**standard:** artifacts must be self-documented

**blueprint contracts reviewed:**
- brief: has `.what`, `.why`, `.the rule`, `.pattern`, `.antipattern`, `.mantra`, `.enforcement`
- hook: has `.what = ...` and `.why = ...` comments that describe purpose

**verdict:** [OK] documentation present

**why it holds:**
- brief is documentation (it's a brief)
- hook has header comments that describe purpose
- follows `sessionstart.notify-permissions.sh` pattern (lines 1-15)

---

### coverage check 7: permission considerations

**standard:** hooks that block need permission patterns

**blueprint hook behavior:**
- emits informational text
- exits 0 (allows continuation)
- does not block or constrain

**verdict:** [OK] no permission considerations needed

**why it holds:**
- hook is informational, not a gate
- compare to `pretooluse.check-permissions.sh` which blocks — that needs permission patterns
- this hook never exits 2, so no permission handle needed

---

## summary

### checklist completion

| from guide | checked? | verdict |
|------------|----------|---------|
| error handle | [x] | not needed (no failure modes) |
| validation | [x] | not needed (no inputs) |
| tests | [x] | planned in blueprint |
| types | [x] | n/a (no TypeScript) |
| other practices | [x] | registration planned |

### coverage checks

| coverage check | required? | present? | verdict |
|----------------|-----------|----------|---------|
| 1. test coverage | yes | yes (planned) | [OK] |
| 2. error handle | no | n/a | [OK] |
| 3. validation | no | n/a | [OK] |
| 4. types | no | n/a | [OK] |
| 5. registration | yes | yes (planned) | [OK] |
| 6. documentation | yes | yes | [OK] |
| 7. permission | no | n/a | [OK] |

**total coverage checks:** 7
**absent patterns:** 0

## conclusion

all required patterns are present in blueprint. no absent standards found.

## what i'll remember

- test coverage must be planned even if tests are in later phase
- not all hooks need error handle — informational hooks have no failure modes
- not all hooks need validation — hooks that don't parse input need no validation
- registration is a required pattern — hooks that aren't registered don't fire

