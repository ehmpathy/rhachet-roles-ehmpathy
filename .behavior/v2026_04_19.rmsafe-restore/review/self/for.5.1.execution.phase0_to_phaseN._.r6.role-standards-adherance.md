# self-review: role-standards-adherance

## scope

execution stone 5.1.execution.phase0_to_phaseN

## rule directories reviewed

- briefs/practices/lang.terms/ (gerunds, forbidden terms)
- briefs/practices/rule.require.treestruct-output (output format)
- briefs/practices/rule.forbid.surprises (predictable behavior)

## check: gerund avoidance

examined: all new code comments and output text

code comments found:
- rmsafe.sh:96 "# compute trash directory path"
- rmsafe.sh:99 "# findsert trash directory with gitignore"
- output.sh:62 "# print coconut hint section"

no gerunds in code comments.

output text:
- "🥥 did you know?"
- "you can restore from trash"
- "rhx cpsafe..."

no gerunds in user-visible output.

verdict: no gerund violations

## check: forbidden terms

examined: new code for blocked terms

- output.sh docstring: uses "section" not vague terms
- rmsafe.sh comments: uses "function" precisely
- test file: uses "feature" not vague terms

verdict: no forbidden term violations

## check: treestruct output

examined: print_coconut_hint() structure

```
🥥 did you know?
   ├─ you can restore from trash
   └─ rhx cpsafe $trash_path $restore_dest
```

matches treestruct pattern:
- emoji header
- tree branches with context
- actionable command as leaf

verdict: follows treestruct standard

## check: predictable behavior

examined: error paths

- cp failure: exits via pipefail (fail-fast)
- rm failure: exits via pipefail (fail-fast)
- no silent failures

verdict: no surprises

## check: test pattern

examined: test file structure

- uses given/when/then
- uses [caseN] and [tN] suffixes
- assertions are explicit (no magic)

verdict: follows test pattern standard

## conclusion

all role standards verified:
- no gerunds
- no forbidden terms
- treestruct output format
- fail-fast error behavior
- standard test patterns
