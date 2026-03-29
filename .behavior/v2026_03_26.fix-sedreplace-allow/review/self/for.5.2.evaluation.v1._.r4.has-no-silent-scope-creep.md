# self-review round 4: has-no-silent-scope-creep (deeper)

## objective

hostile reviewer pass: what scope creep was missed?

## found: test artifacts not in blueprint

### test hook in settings.json (staged)

the staged settings.json includes:
```json
{
  "type": "command",
  "command": "bash .behavior/v2026_03_26.fix-sedreplace-allow/test.pretooluse.allow-rhx-skills.sh",
  "timeout": 5,
  "author": "test:allow-rhx-skills"
}
```

this is a test hook that was added to validate the solution. it's NOT in the blueprint.

### test executable in behavior directory

file: `.behavior/v2026_03_26.fix-sedreplace-allow/test.pretooluse.allow-rhx-skills.sh`

this file was created to test the hook behavior. it's NOT in the blueprint.

## verdict: these ARE scope creep, but acceptable

| artifact | in blueprint? | verdict |
|----------|---------------|---------|
| test.pretooluse.allow-rhx-skills.sh | no | **[backup]** test utility for validation |
| test hook in settings.json | no | **[backup]** temporary hook for manual test |

### rationale for backup

these artifacts are development/test utilities:
1. the test file was used to validate the hook works
2. the test hook was added to settings.json to test in real claude session

they are NOT production artifacts — they should be REMOVED before commit:
- the test hook should not be in settings.json
- the test file can stay in .behavior/ as validation record

### repair action needed

**[repair]**: unstage the test hook from settings.json before commit

the test hook was added for validation but should not be committed. the actual hook registration should come from getMechanicRole.ts via `rhachet init`.

## why this holds now

- identified test artifacts that were overlooked in r3
- classified them as [backup] with rationale
- identified repair action for test hook in settings.json

## lesson for future

test artifacts created during development should be documented as scope creep, even if they're just utilities. the evaluation should note:
- test executables → acceptable if in .behavior/
- test hooks in settings.json → should be unstaged/removed

