# self-review r6: has-consistent-mechanisms

## mechanism reuse audit

scanned blueprint for mechanisms that should reuse extant patterns.

### 1. argument parse

**blueprint**: `[+] parse args (--what, --when)`

**extant pattern**: show.gh.test.errors.sh uses while loop with case statement

**reuse?**: yes — same pattern

### 2. git repo validation

**blueprint**: `[+] validate git repo context`

**extant pattern**: teesafe.sh, cpsafe.sh use `git rev-parse --show-toplevel`

**reuse?**: yes — same pattern

### 3. directory findsert

**blueprint**: `[+] findsert log directory`

**extant pattern**: teesafe.sh uses `mkdir -p`

**reuse?**: yes — same pattern

### 4. gitignore findsert

**blueprint**: `[+] findsert .gitignore with self-ignore`

**extant pattern**: no direct extant pattern, but teesafe.sh has findsert semantics

**reuse?**: new mechanism, but follows findsert idiom

### 5. output functions

**blueprint**: `[←] source claude.tools/output.sh`

**extant pattern**: git.commit.set sources output.sh for turtle vibes

**reuse?**: yes — explicit source, same functions

### 6. exit codes

**blueprint**: `exit 0/1/2`

**extant pattern**: all skills use 0=success, 1=malfunction, 2=constraint

**reuse?**: yes — follows convention

### 7. log file capture

**blueprint**: `[+] capture stdout → log file`

**extant pattern**: no direct extant pattern in skills

**new mechanism?**: yes — this is skill-specific log capture. not duplication because no other skill does this.

## verdict

all mechanisms either reuse extant patterns or are new skill-specific logic. no duplication detected.
