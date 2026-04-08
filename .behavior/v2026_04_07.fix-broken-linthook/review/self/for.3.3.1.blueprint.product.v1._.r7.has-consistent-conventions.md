# self-review r7: has-consistent-conventions

## convention audit

scanned blueprint for divergence from extant name conventions and patterns.

### 1. skill name: git.repo.test

**extant pattern**: `git.repo.get`, `git.commit.set`, `git.release`, `git.stage.add`

**blueprint**: `git.repo.test`

**verdict**: follows `git.{scope}.{verb}` pattern. consistent.

### 2. skill directory structure

**extant pattern**:
```
skills/
├─ git.commit/
│  ├─ git.commit.set.sh
│  └─ git.commit.push.sh
├─ git.release/
│  └─ git.release.sh
```

**blueprint**:
```
skills/
└─ git.repo.test/
   ├─ git.repo.test.sh
   └─ git.repo.test.integration.test.ts
```

**verdict**: follows extant structure. consistent.

### 3. test file name

**extant pattern**: `*.integration.test.ts` for integration tests

**blueprint**: `git.repo.test.integration.test.ts`

**verdict**: follows extant pattern. consistent.

### 4. flag names: --what, --when

**extant pattern**:
- show.gh.test.errors: `--flow`, `--scope`, `--branch`
- git.commit.set: `--mode`, `--push`, `--unstaged`
- sedreplace: `--old`, `--new`, `--glob`, `--mode`

**blueprint**: `--what lint`, `--when hook.onStop`

**verdict**: follows short, lowercase flag pattern. `--what` is new but intuitive. consistent.

### 5. log directory path

**extant pattern**: no extant log directory pattern in skills.

**blueprint**: `.log/role=mechanic/skill=git.repo.test/`

**verdict**: new convention. follows `role={role}/skill={skill}` pattern from vision. forward-compatible structure.

### 6. exit code semantics

**extant pattern**: rule.require.exit-code-semantics.md defines 0=success, 1=malfunction, 2=constraint.

**blueprint**: exit 0 (passed), exit 1 (npm error), exit 2 (lint failed)

**verdict**: follows convention. consistent.

### 7. output format

**extant pattern**: turtle vibes treestruct from rule.require.treestruct-output.md:
- header: `🐢 {vibe}`
- root: `🐚 {skill} [--flags]`
- branches: `├─`, `└─`

**blueprint**:
```
🐢 bummer dude...

🐚 git.repo.test --what lint
   ├─ status: failed
   ├─ defects: 7
   ├─ log: .log/...
   └─ tip: ...
```

**verdict**: follows extant treestruct pattern. consistent.

### 8. hook registration

**extant pattern**:
```typescript
{
  command: './node_modules/.bin/rhx {skill}',
  timeout: 'PT{N}S',
},
```

**blueprint**:
```typescript
{
  command: './node_modules/.bin/rhx git.repo.test --what lint',
  timeout: 'PT60S',
},
```

**verdict**: follows extant hook registration pattern. consistent.

### 9. permission pattern

**extant pattern**:
```jsonc
"Bash(npx rhachet run --skill {skill}:*)",
"Bash(rhx {skill}:*)"
```

**blueprint**:
```jsonc
"Bash(npx rhachet run --skill git.repo.test:*)",
"Bash(rhx git.repo.test:*)"
```

**verdict**: follows extant permission pattern. consistent.

## summary

| name/pattern | status |
|--------------|--------|
| skill name | consistent |
| directory structure | consistent |
| test file name | consistent |
| flag names | consistent |
| log directory | new (forward-compatible) |
| exit codes | consistent |
| output format | consistent |
| hook registration | consistent |
| permission pattern | consistent |

## verdict

all names and patterns follow extant conventions. the log directory path is new but follows the `role={role}/skill={skill}` pattern from the vision document. no divergence detected.
