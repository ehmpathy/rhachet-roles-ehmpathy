# self-review r8: has-consistent-conventions

## deeper convention review

paused and re-examined each name choice with fresh eyes.

### 1. skill name: git.repo.test

**question**: why `git.repo.test` and not `git.test` or `repo.test`?

**extant patterns**:
- `git.repo.get` — operates on git repo
- `git.commit.set` — operates on git commit
- `git.release` — orchestrates git release flow
- `git.stage.add` — stages files for git

**analysis**: the `git.repo.*` namespace means "operations on this git repo". `git.repo.get` gets info from repos. `git.repo.test` tests this repo. this follows the established namespace hierarchy.

**verdict**: consistent. the name accurately describes scope.

### 2. `--what lint` vs `--type lint`

**question**: should the flag be `--what` or a more standard term like `--type` or `--test`?

**extant patterns**:
- show.gh.test.errors: `--scope unit` (what subset)
- git.commit.set: `--mode apply` (how to execute)
- sedreplace: `--glob 'src/**'` (what files)

**analysis**: `--what` asks "what test to run" which is semantically clear. `--type` would also work but `--what` reads more naturally: "git.repo.test --what lint" reads like "test the repo... what? lint."

**verdict**: `--what` is acceptable. clear semantics.

### 3. `--when hook.onStop` context hint

**question**: is `--when` the right flag for context? why not `--context` or `--trigger`?

**extant patterns**: no direct precedent for context hints in skills.

**analysis**: `--when hook.onStop` reads naturally: "when is this run? at hook.onStop." the flag is optional and for future use. `--context` would also work but is more verbose.

**verdict**: `--when` is acceptable for optional context hint.

### 4. log path: `.log/role=mechanic/skill=git.repo.test/`

**question**: is `role=mechanic/skill=git.repo.test` the right structure?

**extant patterns**: no extant log directory patterns. this is new.

**vision reference**: "stdout & stderr into `.log/role=mechanic/skill=git.repo.test/$isotime.{stdout,stderr}.log`"

**analysis**: the path uses `key=value` segments which:
- enables easy `find` queries: `find .log -path '*role=mechanic*'`
- provides clear organization by role and skill
- follows a consistent pattern that could extend to other roles/skills

**question**: should it be `.logs/` (plural) instead of `.log/`?

**extant patterns**: no `.logs/` dir in codebase. `.log/` is shorter.

**verdict**: `.log/role=mechanic/skill=git.repo.test/` follows vision spec. the `key=value` pattern is forward-compatible.

### 5. isotime format in filenames

**question**: what isotime format for filenames?

**blueprint**: `{isotime}.stdout.log`

**analysis**: ISO 8601 format `2026-04-07T14-32-01Z` (colons replaced with hyphens for filesystem safety). this is:
- sortable (chronological order when sorted alphabetically)
- unambiguous (ISO standard)
- filesystem-safe (no colons)

**verdict**: isotime with filesystem-safe characters is correct.

### 6. output labels

**blueprint**:
```
   ├─ status: passed
   ├─ defects: 7
   ├─ log: .log/...
   └─ tip: try `npm run fix`
```

**extant patterns**:
- git.release: `status: awaited`, `pr: #123`
- git.commit.set: `author: seaturtle[bot]`, `uses: 2/3`

**analysis**: lowercase labels with colon separator. consistent with extant skills.

**verdict**: labels follow extant pattern.

### 7. vibe phrases

**blueprint**: "cowabunga!" (success), "bummer dude..." (failure)

**extant patterns** (from rule.require.treestruct-output.md):
- success: "cowabunga!" or "righteous!"
- failure: "bummer dude..."

**verdict**: vibe phrases follow the documented pattern.

## summary

| convention | reviewed | verdict |
|------------|----------|---------|
| skill name | git.repo.test | follows git.repo.* namespace |
| --what flag | semantic | reads naturally |
| --when flag | context hint | optional, clear |
| log path | .log/role=/skill=/ | follows vision, forward-compatible |
| isotime | filesystem-safe ISO | sortable, unambiguous |
| output labels | lowercase: value | follows extant skills |
| vibe phrases | cowabunga/bummer | follows documented pattern |

## verdict

all conventions reviewed and verified. each name choice has clear rationale and follows extant patterns or vision specification.
