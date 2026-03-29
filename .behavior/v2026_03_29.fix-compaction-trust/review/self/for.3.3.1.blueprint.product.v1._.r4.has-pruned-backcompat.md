# self-review r4: has-pruned-backcompat

## backwards compatibility review

### the question

did we add backwards compatibility concerns that the wisher did not request?

backwards compatibility matters when:
- we modify behavior of prior components
- we remove or rename prior artifacts
- we change contracts that other code depends on

### reviewed: boot.yml say section

**what the blueprint does:**
adds `rule.require.trust-but-verify.md` to the always.briefs.say section.

**potential backcompat concern:**
say section briefs consume tokens at boot. each brief reduces the token budget available for conversation. if we add many briefs, boot time increases and context window shrinks.

**did wisher request we consider token budget?**
no. wish says "brief exists and is booted with mechanic role."

**analysis:**
- the brief is short (estimated ~500 tokens based on contract)
- mechanic role already loads ~32,000 tokens of briefs
- 500 tokens is ~1.5% increase
- this is within acceptable bounds
- no backwards compatibility concern here — this is a forward resource concern

**why it holds:**
the wisher explicitly wants the brief booted. token cost is a resource constraint, not a compatibility issue. the brief adds value (prevents 3+ hour debug sessions like the orphan processes incident). resource cost is justified.

---

### reviewed: settings.json PostCompact hook

**what the blueprint does:**
registers postcompact.trust-but-verify.sh under the PostCompact hook event.

**potential backcompat concern:**
Claude Code version compatibility. PostCompact was added in v2.1.79. older versions won't fire this hook.

**did wisher request backwards compat with older Claude Code?**
no. wish mentions "sessionstart hook" without version requirements.

**analysis:**
- hook is marked optional in wish
- older Claude Code versions ignore unknown hook types (graceful degradation)
- no error, no crash — hook simply doesn't fire
- users on older versions miss the reminder but still have the brief

**why it holds:**
graceful degradation is acceptable for optional features. the brief (primary deliverable) works on all versions. the hook (optional enhancement) works on v2.1.79+. no explicit backcompat was requested.

---

### reviewed: potential conflicts with other hooks

**what the blueprint does:**
adds a new PostCompact hook entry to settings.json.

**potential backcompat concern:**
could this conflict with other PostCompact hooks if they exist?

**analysis:**
- checked settings.json structure — hooks are arrays, not single values
- multiple hooks can register for same event
- order is preserved; all hooks fire
- no conflict possible

**why it holds:**
settings.json hook structure supports multiple hooks per event type.

---

### reviewed: file locations

**what the blueprint does:**
creates new files at:
- `src/domain.roles/mechanic/briefs/practices/work.flow/rule.require.trust-but-verify.md`
- `src/domain.roles/mechanic/inits/claude.hooks/postcompact.trust-but-verify.sh`

**potential backcompat concern:**
could these paths conflict with prior files?

**analysis:**
- globbed both paths — no prior files at these locations
- names follow conventions (rule.require.*, postcompact.*)
- no rename or move of prior artifacts

**why it holds:**
new files. no prior artifacts affected.

---

## summary

| concern | wisher requested? | verdict |
|---------|-------------------|---------|
| token budget from brief | no | [OK] justified by value |
| Claude Code version compat | no | [OK] graceful degradation |
| hook conflicts | n/a | [OK] array structure supports multiple |
| file path conflicts | n/a | [OK] new paths, no prior files |

---

### reviewed: conditional hook registration (open question)

**what the blueprint does:**
the blueprint includes an open question about hook registration:
> if rhachet supports onCompact: register in getMechanicRole.ts
> if no: register directly in settings.json via init

this creates two possible implementation paths.

**is this backwards compatibility we added without request?**
yes. we're hedging between two approaches "in case" one doesn't work.

**did wisher request this flexibility?**
no. wisher just said "sessionstart hook (optional)."

**analysis:**
- rhachet Role interface does NOT support onCompact (verified)
- the conditional path is unnecessary
- we should commit to one approach: direct settings.json registration

**how it was fixed:**
updated blueprint to commit to single approach:

before (lines 28-29, 64-65):
```
└── getMechanicRole.ts
    └── [~] add PostCompact hook (if supported)

└── [~] getMechanicRole.ts (or settings.json via init)
    └── hooks.onBrain.onCompact += postcompact.trust-but-verify
```

after:
```
└── inits/getMechanicRole.ts
    └── [~] add PostCompact hook

└── [~] inits/getMechanicRole.ts
    └── hooks.PostCompact += postcompact.trust-but-verify
```

also removed the open question about rhachet onCompact support — no longer needed.

---

## open questions for wisher

none. the conditional hook registration was unnecessary complexity.

## issues found and fixed

| issue | resolution |
|-------|------------|
| conditional hook registration | simplified to direct settings.json approach |

## conclusion

blueprint had one unnecessary backcompat hedge: conditional hook registration. this was simplified to direct settings.json registration since rhachet does not support onCompact.

## what i'll remember

- distinguish resource constraints (token budget) from compatibility concerns
- graceful degradation is acceptable for optional features
- verify path conflicts before we conclude "no prior files affected"
