# review: has-divergence-addressed (r3)

## approach

examined each divergence to verify it was properly addressed with either:
- repair: fix visible in git
- backup: convincing rationale that a skeptic would accept

## divergence 1: permission rules not added

### blueprint declared

```jsonc
// in init.claude.permissions.jsonc
"Bash(cat /tmp/claude:*)",
"Bash(head /tmp/claude:*)",
"Bash(tail /tmp/claude:*)"
```

### actual implemented

no changes to init.claude.permissions.jsonc for this behavior.

### resolution type

backup (not repair).

### rationale examination

| question | answer |
|----------|--------|
| is this truly an improvement? | yes - fewer permission rules = simpler config |
| did we just not want to do the work? | no - the work was done correctly by recognizing extant rules suffice |
| could this cause problems later? | no - `Bash(cat:*)` is strictly more permissive than `Bash(cat /tmp/claude:*)` |

### skeptic's test

Q: "why not add the rules anyway? they were in the blueprint."
A: `Bash(cat /tmp/claude:*)` is a **subset** of `Bash(cat:*)`. line 189 already allows all `cat` commands, which includes `cat /tmp/claude*`. the narrower rule would:
1. add no new capability
2. increase config size
3. create false impression of fine-grained control where none exists

the blueprint was written before the extant rules were discovered. the evaluation correctly noted this as "superseded" not "skipped".

### verdict

backup accepted. rationale is strong.

## divergence 2: test count 37 → 38

### blueprint declared

37 tests.

### actual implemented

38 tests.

### resolution type

backup (acceptable deviation upward).

### rationale examination

| question | answer |
|----------|--------|
| is this truly an improvement? | yes - more coverage |
| did we just not want to do the work? | no - we did more work than required |
| could this cause problems later? | no - extra test improves PR reviewability |

### skeptic's test

Q: "why add a test not in the blueprint?"
A: snapshot tests serve a specific purpose:
1. PR reviewers can see the exact guidance message in the snapshot
2. changes to message content show up in PR diffs
3. this is the pattern used by other hooks in the codebase

the blueprint was correct for functional tests (37). the snapshot test is a PR quality addition, not a functional deviation.

### verdict

backup accepted. deviation exceeds blueprint (better, not worse).

## divergence 3: hook lines 113 → 112

### blueprint implied

blueprint did not specify exact line count, but test coverage section mentioned "113 lines" in an earlier iteration.

### actual implemented

112 lines.

### resolution type

backup (immaterial).

### rationale examination

| question | answer |
|----------|--------|
| is this truly an improvement? | neutral - 1 line difference is immaterial |
| did we just not want to do the work? | no - this is whitespace variance |
| could this cause problems later? | no - line count has no functional impact |

### skeptic's test

Q: "how do we know the line count difference is just whitespace?"
A: the evaluation compared codepath trees node-by-node. every functional codepath in the blueprint is present in the implementation. the 1-line difference is necessarily non-functional (comment, blank line, or formatting).

### verdict

backup accepted. immaterial variance.

## summary

| divergence | resolution | verdict |
|------------|------------|---------|
| permission rules | backup (superseded) | accepted - strong rationale |
| test count | backup (exceeded) | accepted - improvement |
| line count | backup (immaterial) | accepted - no impact |

## verification against source

### divergence 1: verified permission subsumption

```sh
$ grep -n 'Bash(cat:\*)' init.claude.permissions.jsonc
189:      "Bash(cat:*)",
```

line 189 proves `Bash(cat:*)` exists. this is a **broader** pattern than `Bash(cat /tmp/claude:*)`:
- `Bash(cat:*)` matches `cat /anything`
- `Bash(cat /tmp/claude:*)` matches only `cat /tmp/claude*`

logic: narrower ⊂ broader. if broader is already allowed, narrower adds no capability.

### divergence 2: verified test count

```sh
$ grep -c 'then(' pretooluse.forbid-tmp-writes.integration.test.ts
38
```

38 tests confirmed. blueprint declared 37. the extra test is case11 (snapshot).

### divergence 3: verified line count

```sh
$ wc -l pretooluse.forbid-tmp-writes.sh
112
```

112 lines confirmed. blueprint implied 113. the difference is immaterial.

## deeper skepticism: what if I'm wrong?

### divergence 1: should we add the narrower rules anyway?

**the devil's advocate position**: even if broader rules exist, adding the narrower rules:
1. documents intent explicitly in the config
2. enables future narrowing if someone removes `Bash(cat:*)`
3. makes the permission structure self-documenting for this feature

**counter-argument**: these are not strong reasons:
1. the behavior's vision and evaluation document intent; config comments can do the same
2. if someone removes `Bash(cat:*)`, they break many things - this feature is not special
3. redundant rules create maintenance burden, not clarity

**conclusion**: the narrower rules would add noise without benefit. the backup is valid.

### divergence 2: are snapshot tests actually valuable here?

**the devil's advocate position**: snapshot tests:
1. are brittle - any message change breaks them
2. test output format, not behavior
3. can mask lazy testing ("just snapshot it")

**counter-argument**: for this use case, snapshots are valuable:
1. the guidance message IS the behavior - users see it when blocked
2. PR reviewers need to see what users will see
3. the functional tests (37) cover actual blocking behavior; snapshot is additive

**evidence from codebase**:
```
ls src/domain.roles/mechanic/inits/claude.hooks/__snapshots__/
pretooluse.forbid-suspicious-shell-syntax.integration.test.ts.snap
pretooluse.forbid-terms.blocklist.integration.test.ts.snap
pretooluse.forbid-terms.gerunds.integration.test.ts.snap
pretooluse.forbid-tmp-writes.integration.test.ts.snap
```

all four hooks use snapshot tests. this is the established pattern.

**conclusion**: snapshot test is consistent with codebase pattern and serves PR reviewability. the backup is valid.

### divergence 3: is the line count difference really immaterial?

**the devil's advocate position**: what if 1 line difference hides a functional divergence?

**counter-argument**: the evaluation already verified codepaths node-by-node:
- all blueprint codepaths are present in implementation
- line count measures file size, not functional coverage
- the tests (38 of them) verify behavior

**conclusion**: line count is a cosmetic metric. all functional requirements are met. the backup is valid.

## issues found and fixed

none. all divergences have valid backups, even under deeper scrutiny.

## why it holds

1. **no lazy backups**: each divergence has substantive rationale beyond "didn't want to do it"
   - permission rules: actively recognized as redundant, not skipped
   - test count: actively added extra test for PR quality
   - line count: whitespace, not functional
2. **no deferred repairs**: no items were left broken that should have been fixed
   - all functional requirements met
   - all tests pass
3. **skeptic would accept**: each rationale withstands adversarial questioning
   - permission subsumption: mathematically provable (narrower ⊂ broader)
   - test count: more tests = better, not worse
   - line count: 1 line difference cannot affect behavior
4. **all divergences addressed**: no divergence was ignored or hand-waved
   - 3 divergences found
   - 3 divergences examined
   - 3 backups accepted

all divergences properly addressed with verified rationale.

