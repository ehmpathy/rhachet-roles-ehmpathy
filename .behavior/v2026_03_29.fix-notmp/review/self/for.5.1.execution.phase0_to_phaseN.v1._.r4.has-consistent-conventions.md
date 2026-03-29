# review: has-consistent-conventions (r3)

## name conventions

### file name pattern

extant hooks:
- `pretooluse.forbid-stderr-redirect.sh`
- `pretooluse.forbid-suspicious-shell-syntax.sh`
- `pretooluse.forbid-terms.gerunds.sh`
- `pretooluse.forbid-terms.blocklist.sh`
- `pretooluse.forbid-planmode.sh`
- `pretooluse.check-permissions.sh`

my hook:
- `pretooluse.forbid-tmp-writes.sh`

**pattern**: `pretooluse.{verb}-{noun}.sh`

**verdict**: matches. "forbid" is the correct verb. "tmp-writes" describes what is blocked.

### test file name pattern

extant:
- `pretooluse.forbid-suspicious-shell-syntax.integration.test.ts`
- `pretooluse.check-permissions.integration.test.ts`

my test:
- `pretooluse.forbid-tmp-writes.integration.test.ts`

**verdict**: matches.

## term conventions

### "BLOCKED" vs other terms

all extant hooks use `🛑 BLOCKED:` prefix:
- forbid-stderr-redirect: `🛑 BLOCKED: Command contains '2>&1'`
- forbid-suspicious-shell-syntax: `🛑 BLOCKED: ...`
- forbid-terms.gerunds: `🛑 BLOCKED: gerund(s) detected`
- forbid-terms.blocklist: `🛑 BLOCKED: forbidden term(s) detected`

my hook:
- `🛑 BLOCKED: /tmp is not actually temporary`

**verdict**: matches.

### exit code semantics

all hooks use:
- exit 0 = allow
- exit 2 = block

my hook follows the same.

**verdict**: matches.

## structure conventions

### header block

extant pattern:
```
# .what = ...
# .why = ...
# .how = ...
# usage: ...
# guarantee: ...
```

my hook uses the same structure.

**verdict**: matches.

## conclusion

no divergence from extant conventions found. all names, terms, and structures match extant patterns.
