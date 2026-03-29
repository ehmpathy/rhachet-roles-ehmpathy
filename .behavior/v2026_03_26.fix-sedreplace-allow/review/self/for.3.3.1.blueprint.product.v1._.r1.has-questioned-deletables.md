# self-review: has-questioned-deletables

## features reviewed

### hook file (pretooluse.allow-rhx-skills.sh)

**traces to**: usecase.1, usecase.2, usecase.3, usecase.4 in criteria
**required**: yes — core deliverable
**verdict**: keep

### test file (pretooluse.allow-rhx-skills.integration.test.ts)

**traces to**: test coverage requirement in vision
**required**: yes — proves behavior satisfaction
**verdict**: keep

### getMechanicRole.ts update

**traces to**: hook must be registered to function
**required**: yes — without registration, hook never runs
**verdict**: keep

## components reviewed

### positive test cases P1-P5

| case | traces to | keep? |
|------|-----------|-------|
| P1: curly braces | usecase.1.1 | yes — original blocker |
| P2: parentheses | usecase.1.2 | yes — shell metachar |
| P3: square brackets | usecase.1.3 | yes — array syntax |
| P4: pipe in regex | usecase.1.4 | yes — regex alternation |
| P5: complex pattern | usecase.1.5 | yes — multiple metachars |

**verdict**: all trace to explicit criteria, keep all

### negative test cases N1-N10

| case | traces to | keep? |
|------|-----------|-------|
| N1: pipe chain | usecase.2.1 | yes — exfiltration |
| N2: semicolon chain | usecase.2.2 | yes — command injection |
| N3: AND chain | usecase.2.3 | yes — conditional exec |
| N4: OR chain | usecase.2.4 | yes — fallback exec |
| N5: $() substitution | usecase.2.5 | yes — pre-execution |
| N6: backtick substitution | usecase.2.6 | yes — pre-execution |
| N7: newline | usecase.2.7 | yes — command separator |
| N8: redirect | usecase.2.8 | yes — file overwrite |
| N9: process substitution | usecase.2.9 | yes — input injection |
| N10: background exec | usecase.2.10 | yes — hidden execution |

**verdict**: all trace to explicit criteria, keep all

### edge cases E1-E4

| case | traces to | keep? |
|------|-----------|-------|
| E1: non-Bash tool | usecase.3 | yes — pass-through |
| E2: empty command | usecase.4 | yes — fail-safe |
| E3: non-rhx command | usecase.3 | yes — unaffected |
| E4: malformed JSON | usecase.4 | yes — fail-safe |

**verdict**: all trace to explicit criteria, keep all

### quote-aware detection

**traces to**: security rationale in vision (operators inside quotes are safe)
**required**: yes — without this, false negatives on positive cases
**verdict**: keep

### dangerous operators list

**traces to**: negative test boundaries in vision
**required**: yes — defines the security boundary
**verdict**: keep

## questions for deletion

### can we remove any files?

no. three files are minimum viable:
1. hook itself
2. test for hook
3. registration in role

### can we simplify the operator list?

no. each operator represents a distinct attack vector discovered in research.

### did we add features not in the criteria?

no. every feature traces to a criterion.

## conclusion

**no deletables found.** all features and components trace to explicit criteria or security requirements. the blueprint is minimal.
