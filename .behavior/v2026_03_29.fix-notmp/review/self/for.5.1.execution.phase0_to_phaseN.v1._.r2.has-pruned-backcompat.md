# review: has-pruned-backcompat (r2)

## deeper reflection

I re-read pretooluse.forbid-tmp-writes.sh line by line (113 lines). here is my analysis:

## potential backwards compat concerns examined

### 1. does this break extant workflows that write to /tmp?

**question**: if someone was previously able to write to /tmp, will this break them?

**answer**: yes. this is a breaking change for /tmp writes.

**but is this a backwards compat CONCERN?** no. this is the explicit wish:
> "writes into /tmp/* should be auto blocked, in favor of .temp/"

the wisher wants to break this behavior. it is not an assumed backwards compat need - it is the feature itself.

### 2. are there fallbacks, shims, or deprecation paths?

**reviewed**: lines 1-113 of the hook implementation.

**found**: none. the code is direct:
- line 46-58: if path matches /tmp, exit 2
- line 97-108: if command writes to /tmp, exit 2
- line 112: otherwise exit 0

no gradual migration. no warnings before block. no config flags to disable.

**verdict**: this is correct. the wisher did not ask for gradual migration.

### 3. could the hook interfere with other hooks?

**reviewed**: settings.json PreToolUse section (lines 58-137).

**found**: the hook is registered with matcher `Write|Edit|Bash`. it runs alongside:
- forbid-stderr-redirect (Bash)
- check-permissions (Bash)
- forbid-suspicious-shell-syntax (Bash)
- forbid-terms.gerunds (Write|Edit)
- forbid-terms.blocklist (Write|Edit)
- route.mutate.guard (Read|Write|Edit|Bash)

each hook runs independently and exits 0 or 2. no shared state. no interference possible.

**verdict**: no backwards compat concern.

## conclusion

the only "breaking" change is block writes to /tmp - which is the explicit wish.

no backwards compatibility shims, fallbacks, or deprecation paths were added because none were requested.
