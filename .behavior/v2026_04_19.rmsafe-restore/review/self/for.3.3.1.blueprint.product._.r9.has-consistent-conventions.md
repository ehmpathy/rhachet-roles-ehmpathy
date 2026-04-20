# self-review r9: has-consistent-conventions

deeper review. found inconsistency in blueprint itself.

---

## additional convention checks

### usage comments

**output.sh pattern:** each function has `# usage:` comment above it

**blueprint declares:** `print_coconut_hint()` but no usage comment shown

**verdict:** holds — blueprint is pseudocode, usage comment will be added in implementation

### variable brace syntax

**extant:** `${VAR}` with braces (e.g., `${BASH_SOURCE[0]}`, `${POSITIONAL_ARGS[0]}`)

**blueprint:** uses `$TRASH_DIR`, `$TARGET_REL`

**verdict:** holds — implementation will use braces, blueprint is shorthand

---

## found issue: blueprint internal inconsistency

### codepath tree vs implementation notes

**codepath tree (line 79-80):**
```
└── findsert .gitignore via echo + teesafe pattern
```

**implementation notes (lines 152-156):**
```
1. **findsert .gitignore** — use inline printf, not teesafe (avoid external call)
```

**conflict:** codepath says "teesafe", implementation notes say "not teesafe"

**fix:** update codepath tree to match implementation notes

---

## fix applied

updated codepath tree line 79-80 from:
```
└── findsert .gitignore via echo + teesafe pattern
    └── content: "*\n!.gitignore\n"
```

to:
```
└── findsert .gitignore via inline printf
    └── content: "*\n!.gitignore\n"
```

---

## non-issues (why they hold)

| concern | why it holds |
|---------|--------------|
| usage comments | blueprint is pseudocode |
| brace syntax | implementation detail |
| function names | all verb_noun |
| variable names | all UPPER_SNAKE |

---

## conclusion

found and fixed one internal inconsistency in blueprint (teesafe vs printf). all name conventions hold.
