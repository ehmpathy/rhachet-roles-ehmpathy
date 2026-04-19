# self-review: behavior-declaration-coverage

checked each vision requirement against implementation.

## requirement 1: block run_in_background for git.repo.test

**vision line 70:** "invoke the skill with `run_in_background: true` in Bash tool"

**implementation check:**
```bash
RUN_IN_BACKGROUND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.run_in_background // false')
if [[ "$RUN_IN_BACKGROUND" != "true" ]]; then
  exit 0  # allow if not background
fi
```

**verdict:** covered. hook checks `run_in_background` flag and only blocks when true.

---

## requirement 2: error message clarity

**vision line 28:** "error: git.repo.test must run in foreground. use Bash without run_in_background."

**implementation:**
```
🛑 BLOCKED: git.repo.test must run in foreground

background + poll wastes tokens...

fix: remove run_in_background from your Bash tool call
```

**verdict:** covered. message is clear and includes actionable guidance.

---

## requirement 3: handle edgecase - clone tries background

**vision line 113:** "clone tries background → immediate error, clear message"

**implementation:** hook exits 2 immediately with stderr message.

**verdict:** covered.

---

## requirement 4: foreground works as designed

**vision line 114:** "clone runs foreground → works as designed"

**implementation:** hook exits 0 when `run_in_background` is false or absent.

**verdict:** covered.

---

## summary

| requirement | status |
|-------------|--------|
| block background | covered |
| clear error message | covered |
| edgecase: background | covered |
| edgecase: foreground | covered |

all vision requirements implemented. no gaps found.
