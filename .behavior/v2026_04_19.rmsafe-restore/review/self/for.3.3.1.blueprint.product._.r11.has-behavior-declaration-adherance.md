# self-review r11: has-behavior-declaration-adherance

deeper verification of output format details.

---

## restore command format

**vision specifies (line 52):**
```
rhx cpsafe .agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash/path/to/file.ts ./path/to/file.ts
```

**key observation:** both paths are relative from repo root

**blueprint implementation:**
- TRASH_DIR computed as absolute: `$REPO_ROOT/.agent/.cache/.../trash`
- mirror path: `$TRASH_DIR/$TARGET_REL`

**question:** will print_coconut_hint() output relative or absolute paths?

**analysis:**
- vision shows relative: `.agent/.cache/.../trash/path/to/file.ts`
- not absolute: `/home/user/repo/.agent/.cache/.../`
- user runs command from repo root, so relative works

**verdict:** blueprint should output relative paths to match vision

**gap?** blueprint doesn't explicitly state path format in coconut hint

---

## implementation note to add

the blueprint implementation notes should clarify:

```
5. **coconut paths** — use relative paths from repo root
   - trash path: `.agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash/$TARGET_REL`
   - restore dest: `./$TARGET_REL`
```

---

## fix applied

added implementation note 5 to blueprint:

```
5. **coconut paths** — relative from repo root, not absolute
```

---

## other adherance checks

| vision detail | blueprint match |
|---------------|-----------------|
| restore to original location | `./$TARGET_REL` |
| rhx prefix | yes, `rhx cpsafe` |
| trash path structure | `trash/{original_rel_path}` |
| coconut indent | output.sh will handle |

**verdict:** with path format clarified, blueprint adheres fully

---

## found issues

1. path format not explicit in blueprint — fixed with implementation note

---

## non-issues (why they hold)

| concern | why it holds |
|---------|--------------|
| absolute vs relative | implementation note added |
| rhx prefix | matches vision |
| restore destination | `./` prefix matches vision |

---

## conclusion

r11 found and fixed one gap: blueprint now explicitly requires relative paths in coconut hint to match vision output format.
