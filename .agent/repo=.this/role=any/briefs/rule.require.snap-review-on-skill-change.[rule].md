# rule.require.snap-review-on-skill-change

## .what

whenever skills are updated, snapshot diffs must be reviewed to verify test intent is preserved.

## .why

snapshots are symptoms, not the disease. when a snapshot changes unexpectedly:
- the snapshot didn't break — the **behavior** broke
- the snapshot reveals the breakage — it's a diagnostic tool
- a fix to the snapshot without a fix to the behavior hides the problem

blind snapshot updates (`RESNAP=true`) without review mask regressions.

## .how

### 1. check for snapshot changes

```bash
git diff --stat src/**/__snapshots__/
```

### 2. review actual diffs

```bash
git diff src/**/__snapshots__/*.snap
```

### 3. for each change, ask:

| question | if yes | if no |
|----------|--------|-------|
| does this change reflect intended behavior? | accept | reject |
| does the new output preserve test intent? | accept | reject |
| would the original test author approve this? | accept | reject |

### 4. common red flags

| symptom | likely cause |
|---------|--------------|
| hints removed | tree termination logic broke hint emission |
| watch sections removed | exit code 3 (merged) caused skip of watch incorrectly |
| information lost | output function did not emit expected fields |
| format degraded | tree structure logic (`├─` vs `└─`) broke |

## .diagnosis

when snapshots differ from expected, **diagnose the root cause** before you fix:

| source | symptoms | fix |
|--------|----------|-----|
| behavior code | staged behavior has changes, snapshot reflects real output | fix behavior code |
| test mocks | behavior is correct but mocks yield wrong output | fix mocks |
| test setup | test infra changed, same behavior yields different capture | fix test setup |

### how to diagnose

1. **check staged behavior**: `git show :path/to/skill.sh` — is the staged behavior correct?
2. **check extant snapshots**: do staged snapshots show correct expected output?
3. **compare unstaged vs staged**: `git diff path/to/snap` — what differs?

if staged behavior is correct AND staged snapshots show correct output:
- the **mocks** yield wrong output
- fix the mocks, not the behavior

if staged behavior has bugs:
- the **behavior** is broken
- fix the behavior code

### common misdiagnosis

**wrong**: "snapshot shows absent hints → behavior must be broken → edit behavior code"

**right**: "snapshot shows absent hints → check if staged behavior is correct → if yes, mocks yield wrong output → fix mocks"

## .pattern

when you see broken snapshots:

1. **do not** run `RESNAP=true` to make tests pass
2. **do** diagnose: is it behavior, mocks, or test setup?
3. **do** fix the actual root cause
4. **do** verify the fix yields correct output
5. **then** update snapshots if the new behavior is correct

## .example

```bash
# bad: blind resnap
RESNAP=true npm run test:integration -- git.release

# good: review first
git diff src/domain.roles/mechanic/skills/git.release/__snapshots__/
# read the diffs, understand the changes
# fix the behavior if broken
# only then resnap if changes are intentional
```

## .enforcement

- snapshot changes without behavior review = blocker
- `RESNAP=true` without diff review = blocker
- lost information in snapshots = investigate before accept
