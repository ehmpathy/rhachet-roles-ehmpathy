# self-review r6: role-standards-adherance

## briefs directories checked

- `practices/lang.terms/` - naming conventions, forbidden terms
- `practices/code.prod/pitofsuccess.errors/` - exit codes, fail fast
- `.agent/repo=ehmpathy/role=ergonomist/briefs/` - output format (treestruct)

## verification by standard

### rule.forbid.gerunds

searched all 4 skill files for gerund patterns.

new code contains no gerunds. all extant code also clear.

**verdict: ADHERENT**

### rule.forbid.term-forbidden

searched for forbidden term usage.

zero matches for forbidden terms in new additions.

**verdict: ADHERENT**

### rule.require.exit-code-semantics

| code | meaning | our usage |
|------|---------|-----------|
| 0 | success | help output (line 82), zero files (line 254), success (line 225) |
| 2 | constraint | bad input, missing args, user errors |

no exit 1 (malfunction) in our additions - correct since we add no external I/O that could fail.

**verdict: ADHERENT**

### variable naming convention

extant pattern: UPPER_SNAKE_CASE for shell variables.

our additions:
- `LITERAL=false` - correct
- `FROM_ESCAPED` - correct
- `PATTERN_ESCAPED` (globsafe) - correct

**verdict: ADHERENT**

### flag naming convention

extant pattern: `--kebab-case` for long form, `-x` for short form.

our additions:
- `--literal` - correct kebab-case
- `-l` - correct single letter

note: globsafe uses `-l` for `--long`, so `--literal` has no short form there. this is intentional conflict avoidance.

**verdict: ADHERENT**

### rule.require.treestruct-output

"did you know?" hint uses treestruct format:
```
🥥 did you know?
   ├─ path contains `[` which is a glob character
   ├─ to treat `[` as literal, use either:
   │  ├─ --literal flag: rhx mvsafe --literal '...'
   │  └─ escape syntax: rhx mvsafe '...'
   └─ see: rhx mvsafe --help
```

correct use of `├─`, `│`, `└─` connectors.

**verdict: ADHERENT**

## summary

all mechanic role standards verified:
- [x] no gerunds
- [x] no forbidden terms
- [x] semantic exit codes
- [x] UPPER_SNAKE_CASE variables
- [x] --kebab-case flags
- [x] treestruct output format

no violations found.
