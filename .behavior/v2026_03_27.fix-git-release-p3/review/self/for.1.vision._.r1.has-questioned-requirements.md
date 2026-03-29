# self-review: has-questioned-requirements

## reviewed artifacts

- `.behavior/v2026_03_27.fix-git-release-p3/0.wish.md`
- `.behavior/v2026_03_27.fix-git-release-p3/1.vision.md`

---

## requirement 1: tree connectors on await lines

**question**: why add `├─` / `└─` connectors?

**evidence**: current output is visibly broken — blank lines break treestruct, error messages float separately

**what if we didn't?**: output would remain hard to scan, confused debug experience

**simpler way?**: no — this is the minimal fix for broken output

**verdict**: holds. direct fix for observable defect.

---

## requirement 2: commit-based freshness

**question**: why commit ancestry instead of timestamp?

**evidence**:
- wish line 5 says "(timestamp-based: created AFTER prior transport merged)"
- wish lines 72-81 specify `git merge-base --is-ancestor M1 <next-transport-commit>`

**what if we didn't?**: timestamps fail when release PR is created BEFORE feature merge but updated AFTER (stale PR gets picked up)

**simpler way?**: no — commit ancestry is the only reliable approach for squash merges

**found issue**: the wish has internal tension:
- line 5 parenthetical says "timestamp-based"
- line 99 function signature says `prior_merged_at` (timestamp terminology)
- lines 72-81 architectural requirements specify commit-based via `git merge-base`

**resolution**: the architectural requirements (commit-based) are correct. the parenthetical on line 5 was initial frame, superseded by detailed requirements. the function signature should use `prior_merge_commit` (SHA), not `prior_merged_at` (timestamp).

**fix applied**: vision uses `prior_merge_commit` (SHA), aligns with commit-based approach

**verdict**: holds after clarification. commit-based is correct.

---

## requirement 3: single reusable `and_then_await` function

**question**: why unify release PR await and tag await?

**evidence**: wish lines 88-113 specify consolidation

**what if we didn't?**: two separate implementations — inconsistency risk, double maintenance

**simpler way?**: no — unification is the simpler path

**verdict**: holds. DRY applies here.

---

## requirement 4: 13 test cases

**question**: is this test matrix too large?

**evidence**: wish lines 115-148 enumerate combinations: transport × outcome × workflow status

**what if we didn't?**: might miss edge cases in critical release tools

**simpler way?**: could reduce... but release is high-stakes, coverage matters

**verdict**: holds. appropriate for critical tools.

---

## requirement 5: workflow status lookup on timeout

**question**: worth the extra API call?

**evidence**: wish lines 34-36, 44-46 show workflow status on timeout

**what if we didn't?**: user manually checks GitHub Actions — worse UX

**simpler way?**: no — the diagnostic value exceeds the cost

**verdict**: holds.

---

## requirement 6: "release-please" hardcoded

**question**: should workflow name be configurable?

**evidence**: wish implies release-please (line 50 note)

**what if we didn't?**: repos with different workflow names see "not found"

**simpler way?**: hardcoded is fine for ehmpathy repos

**verdict**: acceptable tradeoff. vision already notes this as awkward but acceptable for scope.

---

## requirement 7: blank line for immediate find

**question**: why blank line instead of `✨` inline?

**evidence**: wish lines 62-68 show the pattern

**what if we didn't?**: inline `✨` would break when we DO have wait lines (visual inconsistency)

**simpler way?**: no — blank line is cleanest for immediate, sub-branches for waited

**verdict**: holds. vision evaluates alternatives, concludes this is best.

---

## summary

| requirement | verdict | notes |
|-------------|---------|-------|
| tree connectors | holds | direct fix for broken output |
| commit-based freshness | holds | clarified wish tension (timestamp vs commit) |
| single await function | holds | DRY principle |
| 13 test cases | holds | appropriate for critical tools |
| workflow status lookup | holds | worth extra API call |
| hardcoded workflow name | acceptable | scope-appropriate tradeoff |
| blank line for immediate | holds | cleanest design |

## issues found & fixed

1. **wish internal tension**: "timestamp-based" vs "commit-based" resolved in favor of commit-based (architectural requirements > parenthetical description)
2. **function signature terminology**: vision uses `prior_merge_commit` (SHA) instead of wish's `prior_merged_at` (timestamp terminology)

## open questions remain valid

the vision's open questions (other workflows, timeout config, cumulative vs interval time) are reasonable asks for the wisher, not blockers.
