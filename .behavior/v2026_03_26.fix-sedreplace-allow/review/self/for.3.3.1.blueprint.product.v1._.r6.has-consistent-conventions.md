# self-review round 6: has-consistent-conventions

## deeper review of name choices

### re-examine: "allow" vs other verbs

**question**: should the verb be `allow` or other?

**extant verbs in codebase**:
- `forbid-` (pretooluse.forbid-*)
- `check-` (pretooluse.check-permissions)
- `notify-` (sessionstart.notify-permissions)
- `guard` (posttooluse.guardBorder)

**"allow" analysis**:
- semantic opposite of `forbid-` — makes sense
- describes the action: we allow rhx skills
- alternative: `approve-` — but "allow" is cleaner

**verdict**: `allow-` is appropriate. not extant but semantically correct.

### re-examine: "rhx-skills" description

**question**: is "rhx-skills" the right description?

**what it does**: auto-approves rhx skill commands
**alternatives**:
- `rhx-commands` — but we specifically approve skills
- `rhachet-skills` — longer, less used
- `trusted-commands` — too vague

**verdict**: `rhx-skills` is accurate and concise.

### re-examine: test file type

**r5 decision**: use `.integration.test.ts` despite extant `.test.sh`

**deeper analysis**:
- the research stone (3.1.3.research.internal.product.code.test._.v1.i1.md) shows TypeScript tests are used
- citation points to `pretooluse.forbid-suspicious-shell-syntax.integration.test.ts`
- this means TypeScript integration tests already exist for hooks

**discovery**: i was wrong in r5. TypeScript integration tests ARE the extant pattern for hooks.

**correction**: `.integration.test.ts` IS consistent with extant conventions.

### file structure

**blueprint proposes**:
```
src/domain.roles/mechanic/inits/claude.hooks/
  └── pretooluse.allow-rhx-skills.sh
  └── pretooluse.allow-rhx-skills.integration.test.ts
```

**matches extant**:
```
src/domain.roles/mechanic/inits/claude.hooks/
  └── pretooluse.forbid-suspicious-shell-syntax.sh
  └── pretooluse.forbid-suspicious-shell-syntax.integration.test.ts
```

**verdict**: consistent

## issues found

none in r6. the r5 concern about test file extension was incorrect — TypeScript integration tests are the correct pattern.

## non-issues confirmed

### hook file name pattern

**why it holds**: `pretooluse.[verb]-[description].sh` matches all extant hooks

### test file name pattern

**why it holds**: `.integration.test.ts` matches extant TypeScript test convention

### verb choice "allow"

**why it holds**: semantic opposite of `forbid-`; describes action accurately

### description "rhx-skills"

**why it holds**: accurate, concise, describes what's approved

## conclusion

all conventions are consistent. the r5 concern was based on incomplete information — TypeScript tests are the extant pattern.
