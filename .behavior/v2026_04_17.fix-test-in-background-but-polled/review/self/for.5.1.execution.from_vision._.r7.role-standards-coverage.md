# self-review r7: role-standards-coverage

coverage check of mechanic role standards across all changed files.

## relevant briefs directories

for a shell hook + typescript registration, the relevant standards are:

1. `code.prod/pitofsuccess.errors/` - failfast, failloud
2. `code.prod/readable.comments/` - what-why headers
3. `code.prod/test/` - test coverage
4. `lang.terms/` - no gerunds, ubiqlang
5. `lang.tones/` - lowercase, no shouts

## file 1: pretooluse.forbid-test-background.sh

### pitofsuccess.errors

| rule | present | location |
|------|---------|----------|
| failfast | yes | lines 16-20 (empty stdin), 26-28 (not Bash), 47-52 (not background) |
| failloud | yes | lines 89-102 (stderr message) |

**verdict:** covered.

### readable.comments

| rule | present | location |
|------|---------|----------|
| what-why-how header | yes | lines 3-9 |

**verdict:** covered.

### lang.terms

| rule | present | location |
|------|---------|----------|
| no gerunds | yes | scanned full file |
| ubiqlang | yes | uses "clone", "skill", "foreground", "background" |

**verdict:** covered.

### lang.tones

| rule | present | location |
|------|---------|----------|
| lowercase prose | yes | all comments |
| no shouts | yes | only bash vars use SCREAMING_SNAKE |

**verdict:** covered.

---

## file 2: getMechanicRole.ts

### test coverage

| rule | present | location |
|------|---------|----------|
| test for hook registration | yes | getMechanicRole.test.ts lines 79-84 |

**verdict:** covered.

### code style

| rule | present | location |
|------|---------|----------|
| hook follows extant pattern | yes | matches format of other onTool hooks |

**verdict:** covered.

---

## file 3: getMechanicRole.test.ts

### test quality

| rule | present | location |
|------|---------|----------|
| test is specific | yes | checks filter.what and filter.when |
| test is minimal | yes | only verifies registration, not behavior |

**verdict:** covered. hook behavior tested via integration (manual test of hook).

---

## gap analysis

| category | check | status |
|----------|-------|--------|
| error handle | empty stdin, non-Bash, non-background all handled | no gap |
| validation | JSON parse via jq with defaults | no gap |
| tests | registration test added | no gap |
| types | n/a (shell hook) | no gap |

---

## summary

all mechanic role standards covered:

| standard | file 1 | file 2 | file 3 |
|----------|--------|--------|--------|
| failfast | yes | n/a | n/a |
| failloud | yes | n/a | n/a |
| what-why-how | yes | n/a | n/a |
| no gerunds | yes | yes | yes |
| ubiqlang | yes | yes | yes |
| lowercase | yes | yes | yes |
| no shouts | yes | yes | yes |
| test coverage | n/a | yes | n/a |

no gaps found. all relevant standards applied.
