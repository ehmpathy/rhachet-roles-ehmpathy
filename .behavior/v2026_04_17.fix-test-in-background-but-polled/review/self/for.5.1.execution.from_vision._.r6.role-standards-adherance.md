# self-review: role-standards-adherance

## relevant briefs directories

for a shell hook, the relevant standards are:

1. `code.prod/pitofsuccess.errors/` - failfast, failloud
2. `code.prod/readable.comments/` - what-why headers
3. `lang.terms/` - no gerunds, ubiqlang
4. `lang.tones/` - lowercase, no shouts

## check 1: pitofsuccess.errors

### rule.require.failfast

**requirement:** fail early when preconditions not met

**code review:**
```bash
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2
fi
```

**verdict:** compliant. fails immediately on empty input.

### rule.require.failloud

**requirement:** errors must be visible, not silent

**code review:** all error paths print to stderr with clear messages.

**verdict:** compliant.

---

## check 2: readable.comments

### rule.require.what-why-headers

**requirement:** file header with `.what`, `.why`, `.how`

**code review:**
```bash
# .what = PreToolUse hook to block rhx git.repo.test in background mode
# .why  = clones run tests in background then poll the output file...
# .how  = reads JSON from stdin, checks...
```

**verdict:** compliant. all three sections present.

---

## check 3: lang.terms

### rule.forbid.gerunds

**requirement:** no -ing words as nouns

**code review:** scanned hook file. no gerunds found in code or comments.

**verdict:** compliant.

### rule.require.ubiqlang

**requirement:** use domain terms consistently

**code review:** uses `clone`, `skill`, `foreground`, `background` - all domain terms.

**verdict:** compliant.

---

## check 4: lang.tones

### rule.prefer.lowercase

**requirement:** lowercase in prose

**code review:** comments are lowercase (`# read JSON from stdin`).

**verdict:** compliant.

### rule.forbid.shouts

**requirement:** no ALL CAPS except for bash vars

**code review:** only SCREAMING_SNAKE for bash variables. no shouted prose.

**verdict:** compliant.

---

## summary

| standard | status |
|----------|--------|
| failfast | compliant |
| failloud | compliant |
| what-why-how header | compliant |
| no gerunds | compliant |
| ubiqlang | compliant |
| lowercase | compliant |
| no shouts | compliant |

all mechanic role standards met.
