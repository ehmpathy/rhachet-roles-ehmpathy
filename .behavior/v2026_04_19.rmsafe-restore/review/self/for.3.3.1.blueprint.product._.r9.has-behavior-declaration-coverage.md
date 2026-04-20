# self-review r9: has-behavior-declaration-coverage

line-by-line check of wish and vision against blueprint.

---

## wish requirements

| requirement | blueprint coverage | line |
|-------------|-------------------|------|
| cp to `.agent/.cache/.../trash/` before rm | TRASH_DIR compute + cp -P | 33, 42, 52 |
| dir should be gitignored | findsert .gitignore | 7, 79-80 |
| findsert on mkdir | ensure_trash_dir() | 76-80, 152-156 |
| output restore hint | print_coconut_hint() | 8, 44, 55, 70 |

**verdict:** all 4 wish requirements covered

---

## vision requirements

| requirement | blueprint coverage | line |
|-------------|-------------------|------|
| same interface | [○] parse args | 30 |
| enhanced output | print_coconut_hint() | 70 |
| trash at specified path | TRASH_DIR compute | 6, 33 |
| .gitignore findserted | ensure_trash_dir() | 79-80 |
| duplicate delete = overwrite | test [t2] | 133-134 |
| directory = preserve structure | cp -rP, test [t1] | 42, 129-130 |
| symlinks = trash link, not target | cp -P, test [t3] | 52, 136-138 |
| 🥥 did you know? format | print_coconut_hint() | 70 |

**verdict:** all 8 vision requirements covered

---

## test coverage of requirements

| requirement | test case |
|-------------|-----------|
| file to trash | [t0] single file |
| dir to trash | [t1] directory |
| symlink to trash | [t3] symlink |
| duplicate overwrite | [t2] same file twice |
| gitignore created | [t0] trash dir has .gitignore |
| coconut output | [t0], [t1] output includes hint |
| no coconut on crickets | [t4] crickets output |

**verdict:** all requirements have test coverage

---

## found issues

none — blueprint covers all wish and vision requirements.

---

## non-issues (why they hold)

| concern | why it holds |
|---------|--------------|
| wish cp first | blueprint: cp before rm in both paths |
| wish gitignore | blueprint: findsert in ensure_trash_dir() |
| wish restore hint | blueprint: print_coconut_hint() |
| vision interface | blueprint: args unchanged [○] |
| vision output | blueprint: 🥥 section added |
| vision symlinks | blueprint: cp -P + test [t3] |
| vision overwrite | blueprint: test [t2] confirms |

---

## conclusion

blueprint has complete coverage of behavior declaration:
- all 4 wish requirements addressed
- all 8 vision requirements addressed
- test coverage for each requirement
