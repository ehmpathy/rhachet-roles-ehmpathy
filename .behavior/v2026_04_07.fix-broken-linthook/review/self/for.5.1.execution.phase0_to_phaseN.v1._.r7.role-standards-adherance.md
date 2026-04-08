# self-review r7: role-standards-adherance

## deeper dive: line-by-line code review

i will read each file slowly, question each line, and verify against specific rules.

---

## file 1: git.repo.test.sh

### line-by-line review

**lines 1-18: header block**

```bash
#!/usr/bin/env bash
######################################################################
# .what = run repo tests with turtle vibes summary and log capture
#
# .why  = enables lint enforcement in hooks:
#         - exit code 2 forces brain to address defects
#         - summary output saves tokens (details in log file)
#         - consistent vibes across mechanic skills
```

**rule check**: `rule.require.what-why-headers`
- `.what` present: yes (line 3)
- `.why` present: yes (lines 5-8)
- `.what` is single line: yes
- `.why` explains purpose: yes (three bullet points)

**why it holds**: the header follows the exact format from the rule. `.what` summarizes what the skill does. `.why` explains the three motivations behind the skill. this matches the standard format used by sedreplace.sh, git.commit.set.sh, etc.

---

**lines 35-68: argument parse loop**

```bash
while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      shift 2
      ;;
    --what)
      WHAT="$2"
      shift 2
      ;;
```

**rule check**: `rule.forbid.positional-args`
- all args are named flags: yes (--what, --when, --help)
- no positional args: yes
- ignores rhachet-injected flags: yes (--skill, --repo, --role)

**why it holds**: the skill uses only named args. this matches the bash named args pattern from the lesson. the standard says "avoid positional args" and this skill complies — all values are passed via explicit flags like `--what lint`.

---

**lines 73-110: validation guards**

```bash
if [[ -z "$WHAT" ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "git.repo.test"
  echo "   └─ error: --what is required"
  echo ""
  echo "usage: git.repo.test.sh --what lint"
  exit 2
fi
```

**rule check**: `rule.require.failfast`
- validates before work: yes (lines 73-110 all precede line 138 npm call)
- emits clear error: yes ("--what is required")
- exits immediately: yes (exit 2)

**why it holds**: each validation is a guard clause that exits early. the skill validates:
1. --what is provided (line 73)
2. --what is "lint" (line 82)
3. cwd is a git repo (line 92)
4. package.json exists (line 104)

all four checks happen before the npm command runs. this is failfast: fail early, fail loud.

**rule check**: `rule.require.failloud`
- error includes what's wrong: yes
- error includes how to fix: yes (shows usage)
- error includes context: yes (shows got value)

**why it holds**: each error message is actionable. line 85: `only 'lint' is supported (got '$WHAT')` — this tells the user exactly what value they passed and what values are accepted. the user can fix immediately without debug.

---

**lines 167-196: exit code branches**

```bash
if [[ "$NPM_EXIT_CODE" -eq 0 ]]; then
  # lint passed
  ...
  exit 0
else
  if grep -q "npm ERR!" "$STDERR_LOG"; then
    # npm/command error (malfunction)
    ...
    exit 1
  else
    # lint failed (constraint)
    ...
    exit 2
  fi
fi
```

**rule check**: `rule.require.exit-code-semantics`
- exit 0 for success: yes (line 173)
- exit 1 for malfunction: yes (line 187)
- exit 2 for constraint: yes (line 196)

**why it holds**: the skill uses the exact semantic exit codes defined in the standard:
- 0 = "operation completed as expected" → lint passed
- 1 = "malfunction, external error" → npm command itself failed
- 2 = "constraint, user must fix" → lint found defects

the distinction between 1 and 2 matters: exit 1 (malfunction) might be transient (retry could help). exit 2 (constraint) requires user action (fix the lint errors).

---

**lines 169-172, 190-195: turtle vibes output**

```bash
print_turtle_header "cowabunga!"
print_tree_start "git.repo.test --what $WHAT"
print_tree_branch "status" "passed"
echo "   └─ log: $REL_STDOUT_LOG"
```

**rule check**: `rule.require.treestruct-output`
- 🐢 header via print_turtle_header: yes
- 🐚 root via print_tree_start: yes
- ├─ branches via print_tree_branch: yes
- └─ leaf via echo: yes

**why it holds**: the output uses the shared output.sh functions. the format matches:
```
🐢 cowabunga!

🐚 git.repo.test --what lint
   ├─ status: passed
   └─ log: .log/...
```

this is the exact treestruct format. consistent with sedreplace, git.commit.set, git.release, etc.

**rule check**: `rule.im_an.ehmpathy_seaturtle`
- "cowabunga!" for success: yes (line 169)
- "bummer dude..." for failure: yes (line 190)

**why it holds**: the vibe phrases are exact matches from the tone guide. "cowabunga!" is the success phrase. "bummer dude..." is the failure phrase. no deviation from the established vibes.

---

## file 2: git.repo.test.integration.test.ts

### line-by-line review

**lines 1-4: imports**

```typescript
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';
```

**rule check**: `rule.require.given-when-then`
- imports from test-fns: yes

**why it holds**: the test imports `given`, `when`, `then` from test-fns. this is the required bdd pattern library.

---

**lines 86-98: bdd structure**

```typescript
given('[case1] lint passes', () => {
  when('[t0] `rhx git.repo.test --what lint` is run', () => {
    then('exit code is 0', () => {
      const result = runInTempGitRepo({...});
      expect(result.exitCode).toBe(0);
    });
```

**rule check**: `howto.write-bdd`
- given labeled with [caseN]: yes ("[case1]")
- when labeled with [tN]: yes ("[t0]")
- then has assertion: yes (expect)

**why it holds**: the labels follow the bdd lesson pattern. [case1] identifies the scenario. [t0] identifies the time point (first action). each `then` block has exactly one assertion focus (even if multiple expect calls for the same behavior).

---

**lines 140-150: stderr assertion**

```typescript
then('stderr is empty', () => {
  const result = runInTempGitRepo({...});
  expect(result.stderr).toBe('');
});
```

**rule check**: `rule.forbid.failhide`
- meaningful assertion: yes (`expect(result.stderr).toBe('')`)
- not a pass-through: yes

**why it holds**: every `then` block has an explicit assertion. there are no empty test bodies. there are no `expect(true).toBe(true)` patterns. each test verifies a specific behavior.

---

## file 3: getMechanicRole.ts (lines 107-111)

```typescript
onStop: [
  {
    command: './node_modules/.bin/rhx git.repo.test --what lint',
    timeout: 'PT60S',
  },
],
```

**rule check**: hook replacement (from blueprint)
- old `pnpm run --if-present fix` removed: yes
- new `rhx git.repo.test --what lint` added: yes

**why it holds**: the blueprint specified replacement, not addition. there is only one entry in onStop. the old hook is gone completely.

---

## file 4: init.claude.permissions.jsonc (lines 223-225)

```jsonc
// git.repo.test - run lint check
"Bash(npx rhachet run --skill git.repo.test:*)",
"Bash(rhx git.repo.test:*)",
```

**rule check**: permission format
- long form pattern: yes
- short form pattern: yes
- comment describes purpose: yes

**why it holds**: both permission patterns are required for the skill to run without prompts. the comment follows the established format (skill name - purpose).

---

## standards enumeration complete

| file | lines reviewed | rules checked | deviations |
|------|----------------|---------------|------------|
| git.repo.test.sh | 199 | 8 | 0 |
| git.repo.test.integration.test.ts | 430 | 4 | 0 |
| getMechanicRole.ts | 4 | 1 | 0 |
| init.claude.permissions.jsonc | 3 | 1 | 0 |

---

## conclusion

each line reviewed. each rule verified with direct evidence. no deviations from mechanic standards.

the implementation:
- uses semantic exit codes (0/1/2) correctly
- follows failfast and failloud patterns
- has proper .what/.why headers
- uses turtle vibes with exact vibe phrases
- uses treestruct output format
- follows bdd test patterns with proper labels
- has meaningful assertions in all tests

code adheres to mechanic role standards.
