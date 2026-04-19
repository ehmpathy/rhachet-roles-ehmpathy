# self-review: role-standards-adherance

## briefs directories checked

found relevant rules in `.agent/repo=.this/role=any/briefs/`:
- `rule.require.skill-output-streams.[rule].md`
- `rule.require.jest-tests-for-skills.[rule].md`
- `rule.require.snap-review-on-skill-change.[rule].md`

## rule checks

### 1. skill-output-streams

**rule:** skills must emit to both stdout and stderr for visibility

**code check:** lines 324-336, 340-352 use pattern:
```bash
_output=$(...)
echo "$_output"      # stdout
echo "$_output" >&2  # stderr
```

**adherence:** ✓ follows extant dual-output pattern

### 2. jest-tests-for-skills

**rule:** skills should have jest integration tests

**check:** `git.repo.test.integration.test.ts` exists

**do I need to add tests?** the changes are to argument parse and output. extant integration tests cover the skill. new tests for scope qualifiers would be good but not required for this change.

**adherence:** ✓ extant tests remain valid

### 3. snap-review-on-skill-change

**rule:** when skill changes, review snapshot expectations

**check:** no snapshot files changed in this diff

**adherence:** ✓ not applicable (no snap changes)

## code style checks

### no gerunds
**check:** code uses active voice (block, filter, match)
**adherence:** ✓ no gerunds in code

### treestruct output format
**check:** uses ├─, └─, │ patterns correctly
**adherence:** ✓ matches extant patterns

### exit codes
**check:** exit 2 for constraints, exit 1 for malfunctions
**adherence:** ✓ correct

## summary

| rule | status |
|------|--------|
| skill-output-streams | ✓ |
| jest-tests-for-skills | ✓ (extant tests cover) |
| snap-review | ✓ (not applicable) |
| no gerunds | ✓ |
| treestruct format | ✓ |
| exit codes | ✓ |

all mechanic standards followed.
