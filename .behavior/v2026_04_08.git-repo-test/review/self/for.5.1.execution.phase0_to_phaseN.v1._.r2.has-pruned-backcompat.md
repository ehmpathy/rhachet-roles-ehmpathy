# review.self: has-pruned-backcompat (r2)

## deeper review

took more time. re-read the blueprint. re-read the code. found a concrete concern.

## the `--when` flag: dead code preserved for compat

### what I found

```bash
# line 45 - variable declared
WHEN=""

# lines 61-64 - flag parsed
--when)
  WHEN="$2"
  shift 2
  ;;

# line 92 - documented in help
echo "  --when <context> context hint (optional, for future use)"

# NOWHERE ELSE - variable is never used
```

the variable `WHEN` is set but never read. this is dead code.

### why it exists

blueprint says: "the skill is used in hook context (`--when hook.onStop`)"

hooks invoke the skill with `--when hook.onStop`. if I remove the flag parser, hooks fail with "unknown argument: --when".

### the question

did the wisher explicitly request this?

- **explicit**: no. the wish and criteria never mention `--when`
- **implicit**: yes. blueprint references hook invocation pattern

### my recommendation

**keep the flag parser, remove the dead variable**

the flag must be parsed so hooks don't break. but:
- line 45 (`WHEN=""`) can be deleted - variable never used
- line 62 (`WHEN="$2"`) can be simplified to just `shift 2`

this preserves hook compat while deletes dead code.

### action taken

none. flagged for wisher decision:

> **open question**: the `--when` flag is parsed but the value is never used.
> should I delete the dead variable `WHEN` while I keep the flag parser?
> this preserves hook compat but deletes dead code.

## other backwards compat: all confirmed required

| concern | explicitly requested | location in blueprint |
|---------|---------------------|----------------------|
| exit code 2 | yes | "exit code 2 on test failure" |
| summary output | yes | "summary output — no raw jest stream" |
| turtle vibes format | yes | "consistent format — turtle vibes output" |
| --what lint unchanged | yes | "--what lint behavior unchanged" |

## conclusion

found one issue: `--when` flag has dead variable.
recommended fix: delete `WHEN` variable, keep flag parser.
flagged for wisher decision, did not modify without explicit request.
