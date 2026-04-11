# self-review: has-pruned-backcompat

review for backwards compatibility that was not explicitly requested.

---

## review approach

backwards compatibility concerns are additions made "to be safe" rather than requested. i examined the blueprint for:
1. things we kept that could have been changed
2. things we added to avoid a break in extant behavior
3. assumptions about what must remain compatible

---

## issue found and analysis

### issue: `--scope` and `--resnap` flags silently ignored for lint

**what i found**: the blueprint codepath tree (line 92-97) shows:

```
├─ [~] success path
│  ├─ [○] lint: no log persist (only on error)
```

and the brief deliverable (line 286-287) says:

> - **scope is regex** not glob — use `getUserById` not `**/getUserById*`
> - **resnap assumes convention** — repo must handle `RESNAP=true` env var

but the criteria usecase.4 says:

```
when(--what lint --resnap)
  then(ignores --resnap flag)
    sothat(lint has no snapshots to update)

when(--what lint --scope pattern)
  then(ignores --scope flag)
    sothat(lint runs on all files)
```

**analysis**: the blueprint silently ignores `--scope` and `--resnap` when `--what lint`. this is backwards compat behavior — extant lint has no concept of scope or resnap.

**did wisher request this?**: criteria usecase.4 explicitly says to ignore these flags for lint. this is not speculative backwards compat — it was prescribed.

**evidence**: criteria line shows "sothat(lint has no snapshots to update)" which is the reason for the behavior.

**verdict**: keep. explicitly prescribed in criteria.

---

### issue: lint logs only on error

**what i found**: the blueprint codepath tree (line 92-94) shows:

```
├─ [~] success path
│  ├─ [○] lint: no log persist (only on error)
│  └─ [+] unit/integration/acceptance: always persist logs
```

this differs from unit/integration/acceptance which always persist logs.

**analysis**: this is backwards compat — extant lint only saves logs on error. we preserved this behavior rather than unify with the new "always log" approach.

**did wisher request this?**: wish says "do so both on success and failure **for the rest of the tests**" — note "for the rest of the tests", not "for lint". the wish explicitly scopes the "log on success" behavior to unit/integration/acceptance.

**evidence**: wish line says "for the rest of the tests" which excludes lint from the new behavior.

**verdict**: keep. wisher explicitly scoped new behavior to exclude lint.

---

### concern: npm command convention

**what we assumed**: repos have `npm run test:unit`, `test:integration`, `test:acceptance`, `test:lint`.

**is this backwards compat?**: no. this is a forward convention, not backwards compat. we're not retain old behavior — we assume a convention exists.

**should we support other conventions "to be safe"?**: the blueprint says fail-fast if command is absent (line 56-60):

```
├─ [+] validate npm command exists
│  ├─ check package.json for test:${WHAT} command
│  └─ exit 2 if absent with helpful hint
```

we did NOT add fallback detection like "try test:unit, then try npm test, then try jest directly". this would be backwards compat for repos with legacy command names.

**verdict**: correct. no legacy fallbacks added. fail-fast is better.

---

### concern: keyrack owner hardcoded

**what we assumed**: keyrack uses `--owner ehmpath --env test` always.

**is this backwards compat?**: no. this is a current convention, not backwards compat.

**should we add `--env` flag for flexibility "to be safe"?**: no. the assumption review (r4) explicitly deferred `--env` flag. vision says "add `--env` flag if acceptance needs prep" as future work.

**verdict**: correct. no flexibility added "to be safe". deferred properly.

---

### concern: jest output format

**what we assumed**: jest outputs stable format for stats.

**should we add fallback parsers for old jest versions "to be safe"?**: no. the blueprint (line 86) has graceful degradation:

```
└─ [+] fallback: if parse fails, omit stats section (skill still succeeds)
```

this is not backwards compat — it's defensive design for unknown formats, not support for old jest versions.

**verdict**: correct. graceful degradation is not the same as backwards compat.

---

## backwards compat NOT found in blueprint

searched for backwards compat that was added "to be safe":

| candidate | added? | why |
|-----------|--------|-----|
| vitest support | no | deferred |
| jest 30 `--testPathPatterns` | no | deferred |
| legacy `npm test` fallback | no | fail-fast instead |
| old jest output parsers | no | graceful degradation instead |
| keyrack `--env` override | no | deferred |
| `--verbose` flag | no | not requested |

no backwards compat was added speculatively.

---

## summary

| item | backwards compat? | wisher requested? | verdict |
|------|-------------------|-------------------|---------|
| lint ignores --scope/--resnap | yes | yes (criteria usecase.4) | keep |
| lint logs only on error | yes | yes (wish scopes to "rest of tests") | keep |
| npm command convention | no (forward convention) | n/a | n/a |
| keyrack owner hardcoded | no (current convention) | n/a | n/a |
| jest parse fallback | no (defensive design) | n/a | n/a |

---

## conclusion

**no backwards compat issues found.**

two backwards compat behaviors were identified:
1. `--scope`/`--resnap` ignored for lint — prescribed in criteria
2. lint logs only on error — wisher explicitly scoped new behavior to exclude lint

both were requested by wisher. no backwards compat was added "to be safe" without explicit request.

candidates that could have been added for backwards compat (vitest, jest 30, legacy npm commands, old jest parsers, keyrack --env) were correctly deferred or rejected.
