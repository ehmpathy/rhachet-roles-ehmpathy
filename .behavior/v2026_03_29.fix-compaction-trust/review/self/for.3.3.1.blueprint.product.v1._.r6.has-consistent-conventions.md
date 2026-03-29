# self-review r6: has-consistent-conventions

## convention consistency review

### brief name convention

**searched:** `src/domain.roles/mechanic/briefs/practices/work.flow/**/*.md`

**extant examples:**
- `rule.require.test-covered-repairs.md` — requirement rule
- `rule.require.commit-scopes.md` — requirement rule
- `rule.prefer.sedreplace-for-renames.md` — preference rule
- `howto.bisect.[lesson].md` — howto lesson

**pattern identified:** `{directive}.{subject}.md` where:
- directive = `rule.require`, `rule.prefer`, `howto`
- subject = kebab-case descriptor
- `[lesson]` suffix for howtos only

**blueprint uses:** `rule.require.trust-but-verify.md`

**verdict:** [OK] follows extant pattern exactly

**why it holds:**
- `rule.require.` prefix: blueprint enforcement says "action on unverified inherited claim = blocker" — this makes it a requirement, not a preference
- `trust-but-verify` subject: kebab-case, describes the rule
- no `[lesson]` suffix: correct since this is a rule that mandates behavior, not a howto that teaches technique
- parallel: just like `rule.require.test-covered-repairs.md` mandates tests for fixes, `rule.require.trust-but-verify.md` mandates verification before action

---

### hook name convention

**searched:** `src/domain.roles/mechanic/inits/claude.hooks/*.sh`

**extant examples:**
- `sessionstart.notify-permissions.sh` — event=sessionstart, purpose=notify-permissions
- `pretooluse.check-permissions.sh` — event=pretooluse, purpose=check-permissions
- `pretooluse.forbid-suspicious-shell-syntax.sh` — event=pretooluse, purpose=forbid-suspicious-shell-syntax
- `posttooluse.guardBorder.onWebfetch.sh` — event=posttooluse, purpose=guardBorder.onWebfetch

**pattern identified:** `{event}.{purpose}.sh` where:
- event = lowercase Claude Code event type (sessionstart, pretooluse, posttooluse)
- purpose = kebab-case or dot-separated descriptor

**blueprint uses:** `postcompact.trust-but-verify.sh`

**verdict:** [OK] follows extant pattern exactly

**why it holds:**
- `postcompact` event prefix: lowercase form of Claude Code `PostCompact` event, consistent with `sessionstart` (lowercase of `SessionStart`)
- `trust-but-verify` purpose: kebab-case descriptor, consistent with `notify-permissions`, `check-permissions`
- parallel: just like `sessionstart.notify-permissions.sh` emits info at session start, `postcompact.trust-but-verify.sh` emits reminder after compaction

---

### brief content structure convention

**examined:** `rule.require.test-covered-repairs.md` (lines 1-30)

**extant sections:**
```
# rule.require.test-covered-repairs

## .what
## .why
## .the rule
## .pattern
```

**blueprint contract specifies:**
```
# rule.require.trust-but-verify

## .what
## .why
## .the rule
## .pattern
## .antipattern
## .mantra
## .enforcement
```

**verdict:** [OK] extends extant structure with additional sections

**why it holds:**
- core sections (.what, .why, .the rule, .pattern) match exactly
- additional sections (.antipattern, .mantra, .enforcement) are additive
- .antipattern is the inverse of .pattern — natural extension
- .mantra captures the memorable phrase — fits the brief's purpose
- .enforcement makes rule level explicit — clarifies it's a blocker

---

### hook content structure convention

**examined:** `sessionstart.notify-permissions.sh` (lines 1-15)

**extant header:**
```bash
#!/usr/bin/env bash
######################################################################
# .what = SessionStart hook to notify Claude of allowed permissions
#
# .why  = proactively informing Claude...
#
# .how  = reads .claude/settings.json...
```

**blueprint contract specifies:**
```bash
#!/usr/bin/env bash
# .what = remind mechanic to verify claims after compaction
# .why = compaction summaries may contain stale conclusions
# guarantee: emits reminder to stdout, exits 0
```

**verdict:** [OK] follows extant structure (simplified)

**why it holds:**
- `#!/usr/bin/env bash` shebang: identical
- `.what` and `.why` comments: identical pattern
- guarantee comment: parallel to `.how` but more compact
- simpler hook = simpler header. no `.how` needed since the mechanism is obvious (emit text, exit 0)

---

### brief location convention

**extant pattern:** work.flow/ has subdirectories by topic:
- diagnose/ — diagnosis techniques
- refactor/ — refactor practices
- release/ — release workflow
- tools/ — tool usage

**blueprint uses:** work.flow/ (root)

**potential concern:** "trust but verify" relates to diagnosis. should it be in diagnose/?

**resolution:** wish explicitly states `work.flow/`, not `work.flow/diagnose/`. follow the wish.

**verdict:** [OK] follows wish

**why it holds:**
- wish is explicit about location
- "trust but verify" is broader than diagnosis (applies to all inherited claims)
- root placement reflects its cross-cut nature

---

### boot.yml registration convention

**extant pattern:** briefs in always.briefs.say or always.briefs.ref

**blueprint uses:** extend always.briefs.say

**verdict:** [OK] aligns with extant pattern

---

### hook registration convention

**extant pattern:** hooks registered in getMechanicRole.ts

**blueprint uses:** extend hooks.onBrain.onBoot with filter.what: PostCompact in getMechanicRole.ts

**verdict:** [OK] aligns with extant pattern

---

## summary

| element | extant convention | blueprint | verdict |
|---------|-------------------|-----------|---------|
| brief name | `rule.require.*.md` | `rule.require.trust-but-verify.md` | [OK] |
| brief sections | .what/.why/.the rule/.pattern | same + .antipattern/.mantra/.enforcement | [OK] extends |
| hook name | `{event}.{purpose}.sh` | `postcompact.trust-but-verify.sh` | [OK] |
| hook header | `#!/usr/bin/env bash` + .what/.why | same pattern, simplified | [OK] |
| brief location | wish says work.flow/ | work.flow/ | [OK] follows wish |
| boot.yml | always.briefs.say | extend say section | [OK] |
| hooks.jsonc | hooks.{Event} array | extend PostCompact | [OK] |

## conclusion

all names and patterns follow extant conventions:
- brief name follows `rule.require.*.md` pattern (parallel to `rule.require.test-covered-repairs.md`)
- hook name follows `{event}.{purpose}.sh` pattern (parallel to `sessionstart.notify-permissions.sh`)
- brief content structure extends extant sections with natural additions
- hook header follows extant pattern but simpler (no `.how` needed for simple emit)

no divergence found. no fixes required.

## what i'll remember

- examine specific extant files before the review, not just glob results
- cite line numbers and exact text when possible
- structure matters: brief sections (.what/.why/.the rule) are a convention
- hook headers (.what/.why) are a convention
- simpler mechanisms can use simpler headers — no need to force complexity

