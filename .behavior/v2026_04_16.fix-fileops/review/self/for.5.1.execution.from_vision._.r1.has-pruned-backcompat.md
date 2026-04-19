# self-review: has-pruned-backcompat

## backward compatibility decisions reviewed

### 1. default behavior unchanged (glob detection preserved)

**what we did:** when `--literal` is NOT passed, behavior is identical to before.

**did wisher request this?** Yes - vision says "why `--literal` flag (not change default): preserves backward compatibility".

**evidence it's needed:** extant scripts and automation depend on current glob behavior.

**verdict: EXPLICITLY REQUESTED**

### 2. `-l` short form on mvsafe/rmsafe/cpsafe

**what we did:** added `-l` as alias for `--literal`.

**did wisher request this?** No - CLI convention, not explicit request.

**is this backward compat or new feature?** New feature (shortcut). Not backward compat concern.

**verdict: NEW FEATURE** - acceptable as minor ergonomic addition, standard CLI practice.

### 3. globsafe `-l` already taken by `--long`

**what we did:** globsafe `--literal` has no short form.

**did wisher request this?** No - but preserves extant `-l` = `--long` behavior.

**evidence it's needed:** to repurpose `-l` would break extant usage.

**verdict: CORRECT** - would be a break to repurpose `-l`.

### 4. `is_glob_pattern()` function unchanged

**what we did:** kept the function, added conditional bypass.

**did wisher request this?** Implicitly - via choice of `--literal` flag over default behavior change.

**evidence it's needed:** other code may depend on this function.

**verdict: HOLDS** - minimal change approach.

## summary

| backcompat decision | explicitly requested | evidence needed |
|---------------------|---------------------|-----------------|
| default glob behavior | YES (vision) | extant scripts |
| `-l` short form | NO (new feature) | n/a |
| globsafe `-l` = `--long` | YES (implicit) | extant usage |
| `is_glob_pattern()` kept | YES (implicit) | minimal change |

## no unnecessary backward compat found

all backward compat decisions were either:
1. explicitly requested by wisher (vision)
2. necessary to avoid a break in extant functionality
3. or are new features, not backward compat

no "just in case" compat shims added.
