# self-review r9: has-role-standards-adherance

## mechanic role standards review

### rule directories enumerated

**enumeration method:** ran `tree -d src/domain.roles/mechanic/briefs/practices/ -L 2`

**directories found:** 29

**relevant to this blueprint:**
| directory | why relevant |
|-----------|--------------|
| `lang.terms/` | blueprint introduces term "claim", must check ubiqlang |
| `lang.tones/` | brief and hook have text output, must check tone |
| `code.prod/readable.comments/` | hook has .what/.why, must check format |
| `work.flow/` | brief location, must check subdirectory conventions |

**not relevant (code artifacts, not briefs/hooks):**
| directory | why not relevant |
|-----------|------------------|
| `code.prod/evolvable.*` | for code procedures, not briefs |
| `code.prod/pitofsuccess.*` | for code procedures, not briefs |
| `code.test/*` | for test code, not briefs |
| `code.prod/readable.narrative/` | for code narrative flow, not briefs |
| `code.prod/readable.persistence/` | for persistence code, not briefs |

**confirmation:** no rule categories missed for brief/hook artifacts

---

### standard 1: rule.require.what-why-headers

**standard says:** every procedure needs `.what` and `.why` comments

**blueprint brief contract:**
```markdown
## .what
verify inherited claims before you act on them.

## .why
{rationale}
```

**blueprint hook contract:**
```bash
# .what = remind mechanic to verify claims after compaction
# .why = compaction summaries may contain stale conclusions
```

**verdict:** [OK] both artifacts have .what and .why

**why it holds:**
- brief contract explicitly includes `## .what` and `## .why` sections
- hook contract explicitly includes `# .what = ...` and `# .why = ...` comments
- follows the exact pattern from `sessionstart.notify-permissions.sh` (lines 3-11)

---

### standard 2: rule.forbid.gerunds

**standard says:** no -ing noun forms

**blueprint brief contract reviewed:**
- "verify" — verb, not gerund ✓
- "claims" — noun, not gerund ✓
- "verification" — noun from Latin, not gerund ✓

**blueprint hook contract reviewed:**
- "remind" — verb, not gerund ✓
- "compaction" — noun from Latin, not gerund ✓

**verdict:** [OK] no gerunds found

**why it holds:**
- "verification" is derived from Latin "verificare" (to make true), not from verb + -ing
- "compaction" is derived from Latin "compactus" (pressed together), not from verb + -ing
- these are established nouns, not gerunds

---

### standard 3: rule.require.ubiqlang

**standard says:** use ubiquitous language, no synonym drift

**terms in blueprint:**
| term | definition | canonical? |
|------|------------|------------|
| claim | inherited assertion about state | new term, clearly defined |
| verify | check truth of claim | standard verb |
| compaction | Claude Code context reduction | Claude Code term |

**verdict:** [OK] terms are canonical or clearly defined

**why it holds:**
- "claim" is introduced as new vocabulary with clear definition in brief
- "verify" is a standard English verb, no ambiguity
- "compaction" is Claude Code's own term for the feature

---

### standard 4: rule.require.treestruct

**standard says:** use [verb][...noun] for mechanisms

**blueprint names:**
- `rule.require.trust-but-verify.md` — follows `[directive].[subject].md` pattern for briefs
- `postcompact.trust-but-verify.sh` — follows `[event].[purpose].sh` pattern for hooks

**verdict:** [OK] follows extant patterns

**why it holds:**
- briefs use `rule.require.*` or `howto.*` name pattern, not treestruct verb pattern
- hooks use `{event}.{purpose}` name pattern, documented in extant hooks
- blueprint follows the specific conventions for briefs and hooks, not generic treestruct

---

### standard 5: rule.prefer.lowercase

**standard says:** lowercase unless code construct or proper noun

**blueprint contract text reviewed:**
- brief: "verify inherited claims before you act" — lowercase ✓
- brief: "trust but verify — don't even trust yourself" — lowercase ✓
- hook: "compaction occurred" — lowercase ✓

**exceptions:**
- "Claude Code" — proper noun, capitalized correctly
- "PostCompact" — code construct (event type), capitalized correctly

**verdict:** [OK] follows lowercase preference

---

### standard 6: rule.im_an.ehmpathy_seaturtle

**standard says:** mechanic is friendly seaturtle, uses chill vibes

**blueprint hook output reviewed:**
```
⚠️ compaction occurred

inherited claims may be stale:
- diagnoses ("X is the problem")
- objectives ("we need to do Y")
- state claims ("file contains Z")
- conclusions ("the fix is W")

verify before you act.

see: rule.require.trust-but-verify
```

**tone analysis:**
- concise and direct — matches seaturtle's "slow and steady" vibe
- no exclamation marks or aggressive language
- uses neutral emoji (⚠️) for attention, not alarm
- polite instruction "verify before you act" — not demanding

**verdict:** [OK] tone is appropriate

**why it holds:**
- hook is a reminder, not a celebration — no "shell yeah" or "cowabunga" appropriate
- informational hooks like `sessionstart.notify-permissions.sh` also use neutral tone
- the seaturtle vibe is for positive interactions; this is a gentle nudge

---

### standard 7: rule.forbid.buzzwords

**standard says:** avoid buzzwords; use precise terms

**blueprint terms reviewed:**
| term | buzzword? | analysis |
|------|-----------|----------|
| "verify" | no | precise verb: check truth of claim |
| "inherited" | no | precise: received from prior context |
| "claims" | no | precise: assertions about state |
| "stale" | no | precise: no longer current |

**verdict:** [OK] no buzzwords found

**why it holds:**
- all terms have specific, unambiguous meanings in context
- no marketing speak or filler words
- contrast: would flag "leverage", "synergy", "paradigm" as buzzwords

---

### standard 8: rule.require.exit-code-semantics

**standard says:** exit 0 = success, exit 1 = malfunction, exit 2 = constraint

**blueprint hook contract:** exit 0

**analysis:**
- hook is informational, not a gate
- hook should allow continuation (exit 0)
- hook does not block or constrain (not exit 2)
- hook has no failure mode (not exit 1)

**verdict:** [OK] exit 0 is correct

---

## summary

| standard | blueprint | verdict |
|----------|-----------|---------|
| rule.require.what-why-headers | .what/.why present | [OK] |
| rule.forbid.gerunds | none found | [OK] |
| rule.require.ubiqlang | terms canonical | [OK] |
| rule.require.treestruct | follows brief/hook patterns | [OK] |
| rule.prefer.lowercase | lowercase except proper nouns | [OK] |
| rule.im_an.ehmpathy_seaturtle | neutral tone for nudge | [OK] |
| rule.forbid.buzzwords | no buzzwords | [OK] |
| rule.require.exit-code-semantics | exit 0 (allow) | [OK] |

**total standards checked:** 8
**violations found:** 0

## conclusion

blueprint adheres to all relevant mechanic role standards. no violations found.

## what i'll remember

- enumerate relevant rule directories before the review
- "verification" and "compaction" are Latin-derived nouns, not gerunds
- briefs and hooks have their own name conventions separate from treestruct
- exit 0 for informational hooks that should not block

