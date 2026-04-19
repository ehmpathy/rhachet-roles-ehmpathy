# self-review r8: role-standards-coverage (shell deep dive)

## methodology

focused on shell-specific best practices not covered in previous rounds.

## shell strictness

verified all 4 skills have proper bash strictness at file header:

| file | line 27 | shopt line 34 |
|------|---------|---------------|
| mvsafe.sh | `set -euo pipefail` | `shopt -s globstar nullglob` |
| rmsafe.sh | `set -euo pipefail` | `shopt -s globstar nullglob` |
| cpsafe.sh | `set -euo pipefail` | `shopt -s globstar nullglob` |
| globsafe.sh | `set -euo pipefail` | `shopt -s globstar nullglob` |

our additions do not change these - shell strictness preserved.

**verdict: COVERED**

## variable quote check

checked all new code for proper variable quotes to prevent word split:

| line | code | quoted? |
|------|------|---------|
| 242 | `"$LITERAL"` | yes |
| 242 | `"$FROM"` | yes |
| 244 | `"${FROM//\[/\\[}"` | yes (parameter expansion) |
| 250 | `'$FROM'` | single quotes intentional (example output) |

all variables in conditionals and assignments properly double-quoted.

**verdict: COVERED**

## flag parse pattern

our `--literal|-l)` case follows extant pattern:

```bash
--literal|-l)
  LITERAL=true
  shift
  ;;
```

matches extant `--from)` and `--into)` patterns:
- simple variable assignment
- appropriate shift count
- no side effects

**verdict: COVERED**

## security considerations

| concern | status | evidence |
|---------|--------|----------|
| command injection | safe | no user input passed to eval/exec in new code |
| path traversal | safe | extant validation unchanged, our code only affects glob interpretation |
| unquoted variables | safe | all variables properly quoted |

our additions only affect glob pattern interpretation; they do not introduce new attack surface.

**verdict: COVERED**

## performance

| concern | status | evidence |
|---------|--------|----------|
| unnecessary subshells | none | parameter expansion used for escape |
| unnecessary external commands | none | pure bash for escape logic |

escape logic `${FROM//\[/\\[}` is efficient parameter expansion, no fork.

**verdict: COVERED**

## ergonomist briefs

checked against `.agent/repo=ehmpathy/role=ergonomist/briefs/`:

| rule | coverage |
|------|----------|
| rule.require.treestruct-output | "did you know?" uses treestruct |
| rule.forbid.surprises | `--literal` is explicit, not magic |

**verdict: COVERED**

## summary

deep shell-specific review complete:

- [x] shell strictness (`set -euo pipefail`) preserved
- [x] variable quotes correct throughout
- [x] flag parse follows extant pattern
- [x] no security concerns introduced
- [x] efficient bash constructs (no unnecessary forks)
- [x] ergonomist standards met

all 179 lines of additions follow shell best practices.
