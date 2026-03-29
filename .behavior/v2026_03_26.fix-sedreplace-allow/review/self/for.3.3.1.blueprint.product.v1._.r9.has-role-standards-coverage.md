# self-review round 9: has-role-standards-coverage

## objective

verify all relevant mechanic standards are present in the blueprint — check for absent patterns, not just adherance.

## rule directories to check

### bash hook implementation

1. `lang.terms/` — name conventions
2. `lang.tones/` — tone, emojis, personality
3. `code.prod/readable.comments/` — header standards
4. `code.prod/pitofsuccess.errors/` — exit code semantics
5. `code.test/frames.behavior/` — test patterns

### what might be absent?

- error messages for blocked operations?
- log output for debug?
- comment paragraphs in implementation?

## coverage check: error messages

**standard**: when an operation fails, provide helpful error context

**blueprint behavior**: this hook doesn't fail; it either allows or passes through. no error messages needed because:
- allow → returns JSON
- pass-through → exits silently, lets Claude prompt

**is any element absent?**: no. the fail-safe design means errors go to Claude's normal flow.

**verdict**: covered (via design, not code)

## coverage check: debug output

**standard**: operations should be observable

**blueprint behavior**: no debug output specified

**question**: should the hook log when it auto-approves?

**analysis**:
- Claude Code's debug logs already show hook output
- added output would appear in stderr
- could clutter debug logs with every command

**decision**: debug output is optional. the hook's JSON output is sufficient for debug via Claude's logs.

**verdict**: acceptable (debug via Claude's extant logs)

## coverage check: test cases

**standard (from rule.require.test-covered-repairs.md)**: every behavior must have test coverage

**blueprint test coverage**:
- P1-P5: positive cases (allow)
- N1-N10: negative cases (reject)
- E1-E4: edge cases (pass-through)

**are all behaviors tested?**:
- prefix match → P1-P5
- command substitution detection → N5, N6
- operator detection → N1-N4, N8-N10
- newline detection → N7
- non-Bash tool → E1
- empty command → E2
- non-rhx command → E3
- malformed JSON → E4

**verdict**: full coverage of behaviors

## coverage check: hook registration

**standard**: hooks must be registered to run

**blueprint specifies**: add to `getMechanicRole.ts` at START of `hooks.onBrain.onTool`

**is this sufficient?**: yes. the registration section covers:
- command path
- timeout (PT5S)
- filter (what: Bash, when: before)

**verdict**: covered

## coverage check: dependencies

**standard**: document dependencies

**blueprint lists**: jq, grep, sed

**are all deps listed?**: let me trace through the implementation:
- `cat` for stdin — built-in, not listed
- `jq` for JSON output — listed
- `grep -qE` for regex match — listed (grep)
- `sed` for quote strip — listed
- `[[` for newline check — built-in

**absent**: `cat` not listed as dependency

**fix**: add `cat` to dependencies section (or note it's built-in)

**verdict**: minor gap — cat should be listed or noted as built-in

## issue found

### issue 1: cat not listed in dependencies

**observation**: the blueprint uses `cat` to read stdin but doesn't list it

**resolution**: cat is a POSIX built-in, universally available. it doesn't need to be listed as a dependency, but for completeness we can note "uses standard POSIX utilities" or add cat to the list.

**action**: minor — can be noted in execution phase

## non-issues confirmed

### all test cases present

**why it holds**: P1-P5, N1-N10, E1-E4 cover all codepaths

### hook registration complete

**why it holds**: command, timeout, and filter are all specified

### no error messages needed

**why it holds**: fail-safe design delegates errors to Claude's normal flow

### debug via extant logs

**why it holds**: Claude Code logs hook output; no additional debug needed

## conclusion

found one minor gap: cat not listed in dependencies. this is trivial since cat is universally available. no blockers. blueprint has full coverage of required standards.
