# self-review r7: role-standards-adherance (deep dive)

## methodology

1. enumerated all briefs directories in `.agent/repo=ehmpathy/role=mechanic/briefs/practices/`
2. read diff of all 4 changed files line-by-line
3. verified each new line against applicable rules

## briefs directories checked

| directory | rules verified |
|-----------|----------------|
| lang.terms/ | forbid.gerunds, forbid.term-* (all blocklist terms) |
| code.prod/pitofsuccess.errors/ | exit-code-semantics, failfast |
| lang.tones/ | seaturtle vibes (emoji choice) |

## line-by-line verification

### new variables (all 4 files)

```bash
LITERAL=false
FROM_ESCAPED="${FROM//\[/\\[}"
PATTERN_ESCAPED="${PATTERN//\[/\\[}"
```

| check | result |
|-------|--------|
| UPPER_SNAKE_CASE | yes |
| no gerunds | yes |
| no blocklist terms | yes |

### new flag parsing (mvsafe line 55-57)

```bash
--literal|-l)
  LITERAL=true
  shift
  ;;
```

| check | result |
|-------|--------|
| --kebab-case long form | yes |
| single letter short form | yes |
| no side effects in case | yes |

### new --help handler (mvsafe lines 64-82)

```bash
--help|-h)
  echo "usage: mvsafe.sh <from> <into>"
  ...
  exit 0
  ;;
```

| check | result |
|-------|--------|
| exit 0 for help | yes |
| no gerunds in help text | yes |
| clear examples | yes |

### "did you know?" hint (mvsafe lines 241-252)

```bash
if [[ "$LITERAL" != true && "$FROM" == *"["* ]]; then
  FROM_ESCAPED="${FROM//\[/\\[}"
  FROM_ESCAPED="${FROM_ESCAPED//\]/\\]}"
  echo ""
  echo "🥥 did you know?"
  ...
fi
```

| check | result |
|-------|--------|
| treestruct format | yes |
| coconut emoji (user requested) | yes |
| no gerunds | yes |
| actionable guidance | yes |

### comments in our additions

| line | comment | verdict |
|------|---------|---------|
| mvsafe:150 | `# --literal flag forces literal interpretation` | WHY not WHAT - good |
| mvsafe:241 | `# hint if path contains [ and --literal was not used` | WHY not WHAT - good |
| mvsafe:243 | `# escape brackets for display` | WHY - good |
| globsafe:183-185 | `# escape [ and ] via character class escapes` | WHY with technical detail - good |

## blocklist term search

ran grep against our diff for all terms in `rule.forbid.term-*` briefs:

| search | matches in our diff |
|--------|---------------------|
| blocklist terms | 0 |

note: some blocklist terms appear in extant files (symlink.sh, sedreplace.sh, output.sh) but NOT in our changes.

## globsafe -l conflict

globsafe uses `-l` for `--long`, so `--literal` has no short form. verified this is intentional:
- globsafe line 56: `--long|-l)` - extant code
- globsafe line 76: `--literal)` - our addition, no `-l`

no conflict, documented in --help.

## summary

deep verification complete:
- [x] all variable names follow UPPER_SNAKE_CASE
- [x] all flags follow --kebab-case
- [x] no blocklist terms in new code
- [x] no gerunds in new code
- [x] exit codes semantic (0 for help, 0 for zero-files)
- [x] comments explain WHY not WHAT
- [x] treestruct output format correct
- [x] flag conflicts handled properly

no violations found in our 179 lines of additions.
