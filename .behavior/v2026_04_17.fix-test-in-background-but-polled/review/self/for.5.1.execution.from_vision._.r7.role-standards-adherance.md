# self-review r7: role-standards-adherance (deep dive)

expanded review of mechanic role standards with line-level traceability.

## relevant briefs

from `.agent/repo=ehmpathy/role=mechanic/briefs/`:

1. `practices/lang.terms/rule.forbid.gerunds.md` - no -ing nouns
2. `code.prod/pitofsuccess.errors/rule.require.failfast.md` - fail early
3. `code.prod/pitofsuccess.errors/rule.require.failloud.md` - errors visible
4. `code.prod/readable.comments/rule.require.what-why-headers.md` - file headers

## check 1: failfast (line-level)

**brief requirement:** fail early when preconditions not met

**line 16-20 in hook:**
```bash
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2
fi
```

**line 26-28:**
```bash
if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi
```

**line 47-52:**
```bash
RUN_IN_BACKGROUND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.run_in_background // false')
if [[ "$RUN_IN_BACKGROUND" != "true" ]]; then
  exit 0
fi
```

**verdict:** compliant. three early exits before any block logic runs.

---

## check 2: failloud (line-level)

**brief requirement:** errors must be visible, not silent

**line 89-102:**
```bash
echo "🛑 BLOCKED: git.repo.test must run in foreground" >&2
echo "" >&2
echo "background + poll wastes tokens. the skill emits ~50 tokens." >&2
echo "poll loop consumes 2500+ tokens per cycle. foreground is better." >&2
echo "" >&2
echo "fix: remove run_in_background from your Bash tool call" >&2
echo "" >&2
echo "instead of:" >&2
echo "  Bash(command: 'rhx git.repo.test ...', run_in_background: true)" >&2
echo "" >&2
echo "use:" >&2
echo "  Bash(command: 'rhx git.repo.test ...')" >&2
```

**verdict:** compliant. block message is verbose, actionable, and to stderr.

---

## check 3: what-why-how header (line-level)

**brief requirement:** file header with `.what`, `.why`, `.how`

**lines 3-9:**
```bash
# .what = PreToolUse hook to block rhx git.repo.test in background mode
# .why  = clones run tests in background then poll the output file, which
#         consumes 2500+ tokens per poll cycle. the skill emits ~50 tokens.
#         foreground execution is strictly better for token economy.
# .how  = reads JSON from stdin, checks if tool is Bash with run_in_background
#         true and command matches git.repo.test patterns. blocks with exit 2
#         and clear error message if all conditions match.
```

**verdict:** compliant. all three sections present with specific detail.

---

## check 4: no gerunds

**brief requirement:** no -ing words as nouns

**scan of hook file:**
- line 3: "block" not a gerund (verb/noun)
- line 63: comment uses "word boundary" (noun phrase)
- line 77: "match" (verb context)

**scan of getMechanicRole.ts changes:**
- line 51: "forbid-test-background" uses "background" (noun) not gerund

**verdict:** compliant. no gerund nouns found.

---

## check 5: lowercase in prose

**brief requirement:** lowercase in prose

**hook comments:**
- line 3: "# .what = PreToolUse hook..." (lowercase after =)
- line 13: "# read JSON from stdin" (lowercase)
- line 22: "# allow if not Bash" (lowercase)

**verdict:** compliant. all prose lowercase.

---

## check 6: no shouts

**brief requirement:** no ALL CAPS except for bash vars

**bash variables (valid SCREAMING_SNAKE):**
- `STDIN_INPUT`
- `TOOL_NAME`
- `RUN_IN_BACKGROUND`
- `COMMAND`
- `IS_TEST_SKILL`

**non-variable text:**
- line 17: "ERROR:" in error message (acceptable for error prefix)
- line 89: "BLOCKED:" in block message (acceptable for emphasis)

**verdict:** compliant. only vars use SCREAMING_SNAKE.

---

## summary

| standard | location | status |
|----------|----------|--------|
| failfast | lines 16-20, 26-28, 47-52 | compliant |
| failloud | lines 89-102 | compliant |
| what-why-how | lines 3-9 | compliant |
| no gerunds | full file | compliant |
| lowercase prose | all comments | compliant |
| no shouts | full file | compliant |

all mechanic role standards verified at line level.
