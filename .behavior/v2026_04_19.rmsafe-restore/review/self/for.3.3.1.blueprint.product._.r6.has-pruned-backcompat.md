# self-review r6: has-pruned-backcompat

deeper examination of backcompat concerns.

---

## systematic backcompat analysis

### interface layer

| aspect | before | after | break? |
|--------|--------|-------|--------|
| `rmsafe path` | removes file | removes + trashes | no |
| `rmsafe -r dir` | removes dir | removes + trashes | no |
| `rmsafe glob` | removes matches | removes + trashes | no |
| exit code 0 | success | success | no |
| exit code 2 | error | error | no |

**verdict:** interface unchanged. all changes additive.

### output layer

| aspect | before | after | break? |
|--------|--------|-------|--------|
| turtle header | `🐢 sweet` | `🐢 sweet` | no |
| shell root | `🐚 rmsafe` | `🐚 rmsafe` | no |
| branches | path, files, removed | same | no |
| coconut | n/a | added | additive |
| crickets | unchanged | unchanged | no |

**verdict:** output additive only. coconut is new section, doesn't break extant.

### filesystem layer

| aspect | before | after | break? |
|--------|--------|-------|--------|
| file removed | yes | yes | no |
| new files created | no | .agent/.cache/... | additive |
| .gitignore created | no | yes (in trash) | additive |

**verdict:** filesystem changes additive. new files in new location.

---

## what could theoretically break?

### disk space

**concern:** trash accumulates
**was mentioned?** yes — vision says "manual cleanup is fine"
**verdict:** not backcompat — new behavior, documented

### performance

**concern:** cp before rm is slower
**was mentioned?** no
**verdict:** ISSUE — should note performance impact

**analysis:** for normal files, cp + rm is ~2x time. for large files, noticeable.

**decision:** acceptable — safety > speed for rmsafe. not a backcompat concern.

---

## found issues

1. performance impact not documented — but acceptable tradeoff

---

## non-issues (why they hold)

| concern | why not a backcompat break |
|---------|---------------------------|
| interface | unchanged |
| output format | additive only |
| exit codes | unchanged |
| filesystem | new location only |
| disk space | documented in vision |
| performance | safety tradeoff |

---

## conclusion

no backcompat concerns. all changes are additive:
- new output section (coconut)
- new files (trash + gitignore)
- same interface, same exit codes
