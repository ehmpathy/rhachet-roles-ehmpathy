# self-review r7: has-consistent-mechanisms

searched for extant mechanisms that new code might duplicate.

---

## new mechanisms in blueprint

1. ensure_trash_dir() — mkdir -p + gitignore findsert
2. print_coconut_hint() — new output function
3. cp -P pattern — copy preserve symlinks

---

## search results

### mkdir -p pattern

**search:** `mkdir -p` in claude.tools/
**found:** inline usage in mkdirsafe.sh, symlink.sh, sedreplace.sh, mvsafe.sh, teesafe.sh, cpsafe.sh

**analysis:** no shared mkdir helper extant. each command does `mkdir -p` inline.

**verdict:** holds — blueprint follows extant inline pattern

### gitignore findsert

**search:** `.gitignore` in claude.tools/
**found:** only in test files (fs.writeFileSync in sedreplace tests)

**analysis:** no extant bash pattern for gitignore creation. blueprint's inline printf is new but trivial.

**verdict:** holds — no extant mechanism to reuse

### print_ output functions

**search:** `print_` in output.sh
**found:** print_turtle_header, print_tree_start, print_tree_branch, print_tree_leaf, print_tree_file_line

**analysis:** blueprint adds print_coconut_hint() to output.sh, follows extant pattern.

**verdict:** holds — consistent with extant output.sh structure

### cp -P pattern

**search:** `cp -.*P` in claude.tools/
**found:** cpsafe.sh line 226: `cp -P "$FROM_ABS" "$INTO_ABS"`

**analysis:** blueprint uses same `cp -P` pattern for symlink preservation.

**verdict:** holds — reuses extant pattern

### .cache directory

**search:** `.cache` in claude.tools/
**found:** none

**analysis:** trash at `.agent/.cache/...` is a new location. no extant cache pattern to follow.

**verdict:** holds — new feature, no extant pattern

---

## found issues

none — all new mechanisms either follow extant patterns or fill gaps with no extant solution.

---

## non-issues (why they hold)

| mechanism | why consistent |
|-----------|---------------|
| mkdir -p | inline, same as other commands |
| gitignore findsert | no extant bash pattern |
| print_coconut_hint | follows output.sh pattern |
| cp -P | same as cpsafe.sh |
| .cache dir | new feature, new location |

---

## conclusion

blueprint is consistent with extant mechanisms. no duplication introduced.
