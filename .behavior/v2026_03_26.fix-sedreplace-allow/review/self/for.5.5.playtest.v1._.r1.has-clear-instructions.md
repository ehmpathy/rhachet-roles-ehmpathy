# self-review round 1: has-clear-instructions

## objective

verify the playtest instructions are followable.

## review criteria

### can the foreman follow without prior context?

**yes, after fixes.** I identified 4 potential confusion points and fixed them:

1. **"mechanic role active"** — foreman might not know how to verify
   - **fix**: added verification step (check for SessionStart briefs)

2. **"runs WITHOUT a permission prompt"** — foreman might not know what a prompt looks like
   - **fix**: added "what a permission prompt looks like" section with description

3. **"no matches expected, which is fine"** — ambiguous success indicator
   - **fix**: clarified that turtle vibes output (🐢 header) means success, even with 0 matches

4. **edge path 1 was ambiguous** — "may or may not prompt" is not testable
   - **fix**: removed ambiguous edge case, kept only the security boundary test

### are commands copy-pasteable?

**yes.** every command is in a code block:

```sh
rhx sedreplace --old '{ identity: x }' --new '{ identity: y }' --glob 'src/domain.roles/mechanic/getMechanicRole.ts'
```

the foreman can copy-paste directly into Claude Code.

### are expected outcomes explicit?

**yes, after fixes.** each path now has:
- clear success indicator (turtle vibes output)
- what NOT to see (the permission prompt dialog)
- explanation of what "0 matches" means (success, not failure)

## playtest updates made

| issue | fix | location |
|-------|-----|----------|
| role verification | added verification step | prerequisites |
| prompt description | added "what a permission prompt looks like" section | new section |
| success clarity | added "even 0 matches = success" | path 1 outcome |
| ambiguous edge case | removed non-testable edge path | edge paths |

## why this holds

1. identified issues as a reviewer (not author)
2. fixed each issue in the playtest
3. playtest is now unambiguous for a foreman with no context
4. commands are copy-pasteable, outcomes are observable

instructions are clear.
