# self-review: behavior-declaration-adherance

checked each changed file against the vision spec.

## file 1: pretooluse.forbid-test-background.sh

**vision spec:** block invocation of git.repo.test with `run_in_background: true`

**implementation review:**

line 47-52: checks `run_in_background` flag
```bash
RUN_IN_BACKGROUND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.run_in_background // false')
if [[ "$RUN_IN_BACKGROUND" != "true" ]]; then
  exit 0
fi
```

line 63-78: matches test skill patterns
```bash
if [[ "$COMMAND" =~ (^|[[:space:]])(rhx[[:space:]]+git\.repo\.test) ]]; then
  IS_TEST_SKILL=true
fi
```

line 86-102: blocks with clear message
```bash
echo "🛑 BLOCKED: git.repo.test must run in foreground"
...
echo "fix: remove run_in_background from your Bash tool call"
```

**verdict:** matches spec. blocks background, allows foreground, clear message.

---

## file 2: getMechanicRole.ts

**vision spec:** hook must be registered to fire on Bash tool calls

**implementation review:**

line 51-56: hook registered in onTool array
```typescript
{
  command: './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-test-background',
  timeout: 'PT5S',
  filter: { what: 'Bash', when: 'before' },
}
```

**verdict:** matches spec. fires before Bash tool calls.

---

## file 3: getMechanicRole.test.ts

**vision spec:** n/a (tests not specified in vision)

**implementation review:** added test for new hook registration.

**verdict:** correct test coverage added.

---

## summary

| file | spec adherence | status |
|------|---------------|--------|
| hook shell | matches vision | ok |
| hook registration | matches vision | ok |
| tests | standard practice | ok |

all files adhere to the behavior declaration.
