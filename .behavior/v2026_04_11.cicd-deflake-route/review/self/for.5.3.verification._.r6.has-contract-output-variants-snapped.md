# self-review: has-contract-output-variants-snapped (round 6)

## the question

does each public contract have EXHAUSTIVE snapshots?

## what was found in r5

r5 verified all 11 cases have snapshot coverage.

## current state

snapshot file at `src/domain.roles/mechanic/skills/__snapshots__/cicd.deflake.integration.test.ts.snap` has 23 snapshots across all 11 test cases.

## deep verification: snapshot file analysis

read the actual snapshot file (208 lines, 23 exports):

### snapshot 1: case2 init success (lines 3-28)
```
"🐢 tubular!

🐚 cicd.deflake init
   ├─ route: .behavior/v$DATE.cicd-deflake/ ✨
   ├─ created
      ├─ 1.evidence.stone
      ...
      └─ 8.institutionalize.stone

🥥 hang ten! we'll ride this in
   └─ branch main <-> route .behavior/v$DATE.cicd-deflake
"
```
- turtle vibes present
- route directory path shown
- all 15 stone/guard files listed
- bind confirmation at end
- date redacted via regex in test (v$DATE)

### snapshot 2: case4 detect without --into (lines 30-37)
```
"🐢 bummer dude

   └─ error: --into is required

   usage: rhx cicd.deflake detect --into <path>
"
```
- error state uses "bummer dude" vibe
- clear error message
- usage hint included

### snapshot 3: case5 help output (lines 39-51)
```
"usage: rhx cicd.deflake <subcommand>

subcommands:
  init      create route and bind to branch
  detect    scan CI history for flaky tests
  help      show this help

examples:
  rhx cicd.deflake init
  rhx cicd.deflake detect --days 30 --into $route/1.evidence.yield._.detected.json
"
```
- all 3 subcommands documented
- examples show actual usage patterns
- detect example shows --days and --into flags

### snapshot 4: case6 unknown subcommand (lines 53-62)
```
"🐢 bummer dude

   └─ error: unknown subcommand: foo

   valid subcommands: init, detect, help

   run `rhx cicd.deflake help` for usage
"
```
- echoes back the invalid subcommand (foo)
- lists valid options
- points to help command

### snapshot 5: case7 no subcommand (lines 64-76)
identical to case5 help output — this is correct. when no subcommand is provided, the skill shows usage (same as help).

### snapshot 6: case8 not in git repo (lines 78-85)
```
"🐢 bummer dude

   └─ error: not in a git repository

   run this command from within a git repository
"
```
- clear error for edge case
- actionable hint

## contract coverage matrix

| variant type | case | snapped content verified |
|--------------|------|-------------------------|
| init success | case1, case2, case3 | turtle vibes, route list, bind |
| detect success | case9, case11 | turtle vibes, scan output, inventory |
| error: bad args | case4 | --into required + usage |
| error: bad subcommand | case6 | echoes input + valid options |
| error: bad environment | case8 | not in git repo |
| error: auth failure | case10 | gh cli auth hint |
| help/usage | case5, case7 | subcommands + examples |
| real API integration | case11 | real GitHub API response |

## checklist verification

- [x] positive path (success) is snapped — case1, case2, case3 (init), case9, case11 (detect)
- [x] negative path (error) is snapped — case4, case6, case8, case10 all error variants
- [x] help/usage is snapped — case5, case7 both show usage
- [x] edge cases are snapped — case3 (findsert), case8 (not git repo), case11 (real API)
- [x] snapshots show actual output, not placeholder — verified by file read

## what i learned

the snapshot file is the contract. when i read it, i verified:
1. turtle vibes are consistent (tubular/sweet for success, bummer dude for error)
2. treestruct format is maintained
3. error messages are actionable (include usage hints)
4. help output documents all features
5. real API integration (case11) captures actual GitHub response shape

## verdict

holds. 23 snapshots cover all 11 test cases. all contract output variants snapped. the snapshot file content was verified. no blind spots remain.
