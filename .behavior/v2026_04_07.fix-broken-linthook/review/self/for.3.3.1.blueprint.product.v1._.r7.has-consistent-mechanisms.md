# self-review r7: has-consistent-mechanisms

## mechanism reuse audit

scanned blueprint for mechanisms that should reuse extant patterns.

### 1. argument parse

**blueprint**: `[+] parse args (--what, --when)`

**extant pattern**: show.gh.test.errors.sh uses while loop with case statement for arg parse

```bash
while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role) shift 2 ;;
    --flow) FLOW="$2"; shift 2 ;;
    # ...
  esac
done
```

**verdict**: reuse extant pattern. no duplication.

### 2. git repo validation

**blueprint**: `[+] validate git repo context`

**extant pattern**: teesafe.sh, cpsafe.sh validate git context via:

```bash
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [[ -z "$GIT_ROOT" ]]; then
  echo "error: not inside a git repository" >&2
  exit 1
fi
```

**verdict**: reuse extant pattern. no duplication.

### 3. directory findsert

**blueprint**: `[+] findsert log directory`

**extant pattern**: teesafe.sh creates parent dirs:

```bash
mkdir -p "$(dirname "$DEST")"
```

**verdict**: reuse extant pattern. no duplication.

### 4. gitignore findsert

**blueprint**: `[+] findsert .gitignore with self-ignore`

**extant pattern**: teesafe.sh has findsert semantics via `--idem findsert`. for .gitignore, no direct extant pattern found.

**verdict**: new mechanism. this is skill-specific. follows findsert idiom but no exact match to reuse. acceptable new mechanism.

### 5. output functions

**blueprint**: `[←] source claude.tools/output.sh`

**extant pattern**: git.commit.set, git.release, declapract.upgrade all source output.sh for turtle vibes.

**verdict**: explicit reuse via source. correct pattern.

### 6. exit codes

**blueprint**: exit 0 (success), exit 1 (malfunction), exit 2 (constraint)

**extant pattern**: all skills follow this convention (documented in rule.require.exit-code-semantics.md).

**verdict**: follows convention. no duplication.

### 7. log capture to file

**blueprint**: `[+] capture stdout → log file`, `[+] capture stderr → log file`

**extant pattern**: searched codebase for similar patterns.

```bash
# no extant skill captures command output to log files
# this is a new requirement specific to git.repo.test
```

**verdict**: new mechanism. no duplication because no extant skill does log capture.

### 8. isotime filename

**blueprint**: `[+] generate isotime filename`

**extant pattern**: searched for isotime generation.

```bash
# show.gh.action.logs.sh uses date for timestamps but not for filenames
# this is a new pattern specific to log file names
```

**verdict**: new mechanism. acceptable for log file name generation.

## summary

| mechanism | status | action |
|-----------|--------|--------|
| arg parse | extant | reuse |
| git validation | extant | reuse |
| dir findsert | extant | reuse |
| gitignore findsert | new | acceptable |
| output functions | extant | source |
| exit codes | convention | follow |
| log capture | new | acceptable |
| isotime filename | new | acceptable |

## verdict

all mechanisms either reuse extant patterns or are new skill-specific logic that does not duplicate extant functionality. no duplication detected.
