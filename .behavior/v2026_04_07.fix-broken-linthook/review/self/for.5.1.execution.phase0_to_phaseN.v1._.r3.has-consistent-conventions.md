# self-review r3: has-consistent-conventions

## name conventions audit

### skill directory names

extant patterns:
| directory | pattern |
|-----------|---------|
| git.commit | noun.verb |
| git.release | noun.verb |
| git.repo.get | noun.noun.verb |
| git.branch.rebase | noun.noun.verb |
| git.stage | noun.noun |
| set.package | verb.noun |
| claude.tools | noun.noun |

my skill: `git.repo.test`
- follows `git.repo.*` namespace (like `git.repo.get`)
- uses `test` as the operation verb (like `get`)

**verdict**: consistent. follows extant `git.repo.*` pattern.

### main file names

extant patterns:
| directory | main file |
|-----------|-----------|
| git.commit | git.commit.set.sh, git.commit.push.sh, etc. |
| git.release | git.release.sh |
| git.repo.get | git.repo.get.sh |

my skill: `git.repo.test/git.repo.test.sh`
- matches directory name
- follows single-entry pattern like git.repo.get

**verdict**: consistent.

### test file names

extant patterns:
| skill | test file |
|-------|-----------|
| git.commit.set | git.commit.set.integration.test.ts |
| git.release | git.release.integration.test.ts |
| sedreplace | sedreplace.integration.test.ts |

my skill: `git.repo.test.integration.test.ts`

**verdict**: consistent.

### argument names

extant patterns:
| skill | args |
|-------|------|
| sedreplace | --old, --new, --glob, --mode |
| git.commit.set | -m, --mode, --push, --unstaged |
| git.repo.get | --in, --repos, --words, --paths |

my skill: `--what`, `--when`
- `--what` = what test to run (lint, types, unit, etc.)
- `--when` = context hint (hook.onStop)

these are new arg names but follow the pattern of short, clear flags.

**verdict**: acceptable. new flags for new purposes.

### exit code conventions

extant pattern in briefs:
| code | semantic |
|------|----------|
| 0 | success |
| 1 | malfunction |
| 2 | constraint |

my skill uses these exact semantics.

**verdict**: consistent.

### log directory names

my skill: `.log/role=mechanic/skill=git.repo.test/`

this is a new pattern — no extant `.log/` directories in the codebase. but it follows the `role=X/skill=Y` namespace convention used elsewhere (like `.agent/repo=X/role=Y`).

**verdict**: consistent with namespace conventions, new usage of `.log/` directory.

### output vibes

extant turtle vibes:
- `cowabunga!` = success
- `bummer dude...` = failure
- `heres the wave...` = preview/plan

my skill uses:
- `cowabunga!` for pass
- `bummer dude...` for fail/malfunction

**verdict**: consistent.

## conclusion

all name conventions align with extant patterns:
- skill name follows `git.repo.*` pattern
- file names follow extant conventions
- test file follows `.integration.test.ts` pattern
- exit codes match documented semantics
- output vibes match established phrases

no divergence from extant conventions found.
