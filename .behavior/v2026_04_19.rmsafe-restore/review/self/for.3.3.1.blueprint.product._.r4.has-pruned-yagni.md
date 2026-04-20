# self-review: has-pruned-yagni

reviewed for extras not requested.

---

## component-by-component YAGNI check

### ensure_trash_dir()

**requested?** yes — wish says "findserted on mkdir"
**minimum viable?** yes — just mkdir + gitignore
**future flexibility?** no — single purpose
**verdict:** not YAGNI

### print_coconut_hint()

**requested?** yes — wish says "express how one can restore"
**minimum viable?** could inline, but follows output.sh pattern
**future flexibility?** maybe — "other tools may use coconut"
**verdict:** BORDERLINE — but follows extant pattern, acceptable

### mirrored path structure

**requested?** yes — vision decided this explicitly
**minimum viable?** flat would be simpler impl, mirrored simpler UX
**verdict:** not YAGNI — vision decision

### cp -P flag

**requested?** yes — vision says "symlinks trashed as symlinks"
**minimum viable?** yes — one flag
**verdict:** not YAGNI

### cp -r flag for directories

**requested?** yes — vision says "delete directory → preserve structure"
**minimum viable?** yes — one flag
**verdict:** not YAGNI

### test case [t2] same file twice

**requested?** yes — blackbox criteria includes this
**minimum viable?** yes
**verdict:** not YAGNI

### test case [t4] crickets no coconut

**requested?** yes — vision says no coconut for zero deletions
**minimum viable?** yes
**verdict:** not YAGNI

---

## extras scan

did I add any of these?

| anti-pattern | found? |
|--------------|--------|
| "for future flexibility" | print_coconut_hint maybe, but follows pattern |
| "while we're here" | no |
| "optimize before needed" | no |
| extra abstraction | ensure_trash_dir justified by DRY |
| extra features | no |

---

## potential YAGNI identified

### print_coconut_hint() in output.sh

**issue:** only rmsafe uses it. add to shared file implies future use.
**counter:** output.sh is the pattern. cost is one small function.
**decision:** keep — follows pattern, low cost

---

## summary

| component | YAGNI? | reason |
|-----------|--------|--------|
| ensure_trash_dir() | no | requested + DRY |
| print_coconut_hint() | borderline | follows pattern |
| mirrored paths | no | vision decision |
| cp -P | no | requested |
| cp -r | no | requested |
| all test cases | no | from criteria |

no YAGNI to prune. all components trace to requirements.
