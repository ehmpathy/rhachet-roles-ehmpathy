# self-review r12: has-role-standards-adherance

additional standards check after r11.

---

## additional standard: exit code semantics

**rule.require.exit-code-semantics says:**
| code | semantic |
|------|----------|
| 0 | success |
| 1 | malfunction (external error) |
| 2 | constraint (user must fix) |

**extant rmsafe.sh uses:**
- exit 0: success
- exit 2: constraint errors (path not found, outside repo, dir without -r)

**blueprint impact:**
- new trash logic runs on success path only
- error paths unchanged (still exit 2)
- cp failure would be exit 1 (malfunction)

**question:** what if cp to trash fails?

**analysis:**
- `set -e` causes immediate exit on any command failure
- cp failure would exit with cp's exit code (typically 1)
- this is correct: cp failure is malfunction, not constraint

**verdict:** holds — exit code semantics preserved

---

## briefs enumeration (complete)

| category | checked in r11/r12 |
|----------|-------------------|
| pitofsuccess.errors | failfast, failloud, exit-code-semantics |
| pitofsuccess.procedures | idempotency |
| readable.comments | what-why headers |
| evolvable.procedures | single responsibility |
| treestruct output | turtle vibes |

**missed?** no — all shell-relevant categories covered

---

## found issues

none — blueprint adheres to all relevant standards.

---

## non-issues (why they hold)

| standard | why it holds |
|----------|--------------|
| exit-code-semantics | extant codes preserved, cp fail = 1 |
| failfast | set -euo pipefail |
| failloud | no silent failures |
| idempotency | mkdir -p, findsert |
| what-why | extant headers |
| single responsibility | logical units |
| treestruct | turtle vibes format |

---

## conclusion

r12 confirms blueprint adheres to all mechanic role standards. exit code semantics verified.
