# self-review r3: has-questioned-questions (deep answers)

## question 1: does sedreplace support @stdin?

**answered via extant code:** no.

i read `sedreplace.sh` (436 lines). arguments are parsed via `--old "$2"` and `--new "$2"` directly from command line. no stdin support extant.

**implication:** the stdin approach requires code change to sedreplace. it's not a zero-work alternative.

---

## question 2: could we add stdin support easily?

**answered via logic and code review:** yes.

the pattern extant in other skills (e.g., git.commit.set) is:
```bash
# if value is @stdin, read from stdin
if [[ "$OLD_PATTERN" == "@stdin" ]]; then
  OLD_PATTERN=$(cat)
fi
```

this is ~5 lines of code. low effort.

**but:** this only helps if claude code doesn't prompt for `echo '...' | rhx sedreplace`. need to verify that piped content isn't scanned.

---

## question 3: does piped content avoid heuristic scan?

**answered via logic:** likely yes.

claude code scans the *bash command string* for suspicious patterns. when we pipe:
```sh
echo '{ identity: x }' | rhx sedreplace --old @stdin
```

the curly braces are in the `echo` argument, not in the rhx command. the heuristics might still trigger on the echo, but if echo is allowlisted, it should pass.

**but:** the echo command itself contains `{ }`. so we're just moved the problem.

**better approach:**
```sh
cat pattern.txt | rhx sedreplace --old @stdin
```

or use heredoc:
```sh
rhx sedreplace --old @stdin <<'EOF'
{ identity: keyPair.identity }
EOF
```

heredoc might also trigger heuristics due to shell metacharacters. **needs test.**

---

## question 4: what actually triggers the prompt?

**need to verify:** the wish didn't include the exact prompt message.

**[wisher]** — ask: what exact text does claude show when it prompts? this would confirm whether it's:
- "suspicious syntax"
- "shell metacharacters"
- "command not in allowlist"
- other

---

## question 5: is there a simpler solution hidden?

**answered via logic:** maybe.

**option: escape the characters before they reach bash**

instead of:
```sh
rhx sedreplace --old '{ identity: x }'
```

use:
```sh
rhx sedreplace --old '\{ identity: x \}'
```

if the heuristics do naive pattern match, escape might avoid the trigger. **but** this might break sed regex behavior.

**option: base64 encode**

```sh
rhx sedreplace --old-b64 'eyBpZGVudGl0eTogeCB9'
```

decode inside sedreplace. completely avoids shell metacharacters. **but** requires code change and makes usage ugly.

---

## updated question triage

| question | status | answer/action |
|----------|--------|---------------|
| does `permissionDecision: allow` bypass heuristics? | [research] | test with actual hook |
| does sedreplace support @stdin? | [answered] | no, needs code change |
| does stdin/pipe avoid heuristics? | [research] | maybe, depends on echo/heredoc |
| what triggers the prompt? | [wisher] | ask for exact message |
| could we escape chars? | [research] | test if `\{` avoids trigger |

---

## vision update needed

the vision should be updated to reflect:

1. **stdin approach requires sedreplace change** — not zero-effort
2. **multiple options extant** — hook, stdin, escape, base64, wait
3. **need to verify what triggers prompt** — ask wisher for exact message
4. **simpler escape might work** — test `\{` pattern

---

## issue found: vision is incomplete

the vision commits to hook approach without first validated if the problem can be solved via escaped metacharacters in the caller's command.

**test first:** does `rhx sedreplace --old '\{ identity: x \}'` work without prompt?

if yes, no code change needed — just documentation.

---

*r3 reveals: we should test simple escape before we build new features.*
