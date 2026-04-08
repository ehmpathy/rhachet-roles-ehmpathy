# self-review r4: has-consistent-conventions

## deeper dive: question each name choice

paused. re-read code. questioned each name.

## convention comparison: my skill vs codebase

searched for header format patterns:
- `.what =` format: used by 28 skills (git.commit.set, sedreplace, etc.)
- `.what` format (no equals): used by 1 skill (git.repo.get)

my skill uses `.what =` format — the common convention.

## name-by-name audit

### 1. skill name: `git.repo.test`

**question**: why `test` and not `check` or `lint` or `verify`?

extant skills:
- `git.repo.get` - get from repo
- `git.commit.set` - set a commit
- `git.stage.add` - add to stage

pattern: `[noun].[noun].[verb]` where verb is the action.

`test` = runs tests. the skill runs `npm run test:lint`. the verb is accurate.

alternatives considered:
- `git.repo.lint` - too narrow (vision mentions future `--what types`, `--what unit`)
- `git.repo.check` - vague
- `git.repo.verify` - vague

**verdict**: `test` is the right verb. aligns with `npm run test:*` convention.

### 2. directory structure: `git.repo.test/git.repo.test.sh`

**question**: should there be sub-files like git.commit has?

extant patterns:
- `git.commit/` has many: `.set.sh`, `.push.sh`, `.bind.sh`, `.uses.sh`
- `git.repo.get/` has one: `git.repo.get.sh`
- `git.release/` has one main plus internal `._*.sh` files

my skill has one entry point. no subcommands yet. single file is correct.

**verdict**: single file matches simplicity of the skill.

### 3. flag name: `--what`

**question**: is `--what` a good flag name?

extant flags:
- sedreplace uses `--old`, `--new`, `--glob`
- git.commit.set uses `-m`, `--mode`, `--push`
- git.repo.get uses `--in`, `--repos`, `--words`

`--what` is unique but clear: "what test to run".

alternatives:
- `--type` - overloaded term
- `--target` - vague
- `--run` - verb, not noun

**verdict**: `--what` is clear and unambiguous.

### 4. flag name: `--when`

**question**: is `--when` a good flag name?

this flag is for context hints like `hook.onStop`. the skill doesn't use it yet — it's for future.

alternatives:
- `--context` - longer, less clear
- `--trigger` - implies causation

**verdict**: `--when` is intuitive for "when is this run".

### 5. variable names

checked each variable in the shell:
- `WHAT` - matches `--what` flag
- `WHEN` - matches `--when` flag
- `LOG_DIR` - clear
- `LOG_PATH` - clear
- `ISOTIME` - standard term
- `STDOUT_LOG`, `STDERR_LOG` - standard terms
- `NPM_EXIT_CODE` - clear
- `DEFECT_COUNT` - clear
- `REL_STDOUT_LOG`, `REL_STDERR_LOG` - rel = relative, clear

**verdict**: all variable names are clear and consistent with shell conventions.

### 6. output messages

checked each output string:
- "cowabunga!" - extant vibe phrase
- "bummer dude..." - extant vibe phrase
- "status: passed/failed/malfunction" - clear status terms
- "defects: N" - clear
- "log: path" - clear
- "tip: try `npm run fix`" - actionable

**verdict**: all output follows extant vibes conventions.

### 7. log directory path

path: `.log/role=mechanic/skill=git.repo.test/`

this follows the `key=value` namespace convention:
- `.agent/repo=ehmpathy/role=mechanic/`
- `.meter/git.commit.uses.jsonc`

the `.log/` root is new but the nested structure is consistent.

**verdict**: consistent namespace convention.

## articulation: why each convention holds

### 1. skill name `git.repo.test` holds because:
- follows the `git.repo.*` namespace established by `git.repo.get`
- the verb `test` matches `npm run test:*` commands
- extensible: can add `--what types`, `--what unit` in future
- clear: anyone can guess what it does from the name

### 2. header format `.what =` holds because:
- 28 other skills use this format
- only 1 skill (git.repo.get) uses the alternative
- consistency with majority wins

### 3. flag `--what` holds because:
- unique in the codebase — no collision with extant flags
- clear semantics: "what test to run"
- short: 6 characters with dashes
- discoverable: appears in help text

### 4. log path `.log/role=X/skill=Y/` holds because:
- follows `key=value` namespace used by `.agent/`, `.meter/`
- self-descriptive: can find logs by role and skill
- isolated: each skill has its own log directory
- gitignored: `.gitignore` findsert prevents commits

### 5. exit codes hold because:
- documented in briefs: 0=success, 1=malfunction, 2=constraint
- consistent with all other rhachet skills
- semantic: caller knows what action to take

## conclusion

after deeper review, all name choices are consistent:
- `test` verb aligns with `npm run test:*`
- flags are clear and unambiguous
- variable names follow shell conventions
- output follows turtle vibes
- directory structure follows `key=value` namespace

no divergence found. all conventions hold.
