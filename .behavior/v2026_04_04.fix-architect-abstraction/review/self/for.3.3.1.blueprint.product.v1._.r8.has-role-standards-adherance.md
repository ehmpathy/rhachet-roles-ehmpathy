# self-review r8: has-role-standards-adherance

review for adherance to mechanic role standards.

---

## rule directories checked

relevant brief directories for this blueprint:

1. `briefs/practices/lang.terms/` — term conventions
2. `briefs/practices/lang.tones/` — tone and vibe conventions
3. `briefs/practices/code.prod/readable.comments/` — header format
4. `briefs/practices/code.prod/readable.narrative/` — narrative flow (target location)

---

## standards check

### 1. file name conventions

**checked in r5:**
- define.* briefs: no [define] tag (extant pattern)
- philosophy.* briefs: [philosophy] tag (extant pattern)
- rule.* briefs: no tag unless [demo] (extant pattern)

**blueprint status:**
- `define.domain-operation-grains.md` — no tag ✓
- `philosophy.transform-orchestrator-separation.[philosophy].md` — [philosophy] tag ✓
- `rule.require.orchestrators-as-narrative.md` — no tag ✓
- `rule.forbid.decode-friction-in-orchestrators.md` — no tag ✓
- `rule.require.named-transforms.md` — no tag ✓
- `rule.forbid.inline-decode-friction.md` — no tag ✓

**verdict:** follows extant conventions.

---

### 2. directory placement

**checked in r6:**
- architect briefs: `practices/` directory
- mechanic briefs: `practices/code.prod/readable.narrative/`

**blueprint status:**
- architect briefs in `practices/` ✓
- mechanic briefs in `readable.narrative/` ✓

**verdict:** follows extant placement.

---

### 3. content structure (rule.require.what-why-headers)

**extant pattern:**
- H1 matches filename
- H2 sections: .what, .why, .enforcement, etc.

**blueprint outlines:**
- define: has .what, .why, .examples ✓
- rule.require: has .what, .why, .enforcement ✓
- rule.forbid: has .what, .the test, .practical heuristic, .note, .enforcement ✓

**verdict:** follows extant header pattern.

---

### 4. term consistency

**checked in r6:**
- transform: new term, no conflict
- orchestrator: formalizes extant "composer"
- decode-friction: new term, wisher-sourced

**blueprint status:**
- terms used consistently throughout ✓
- no term overload ✓

**verdict:** follows ubiqlang standards.

---

### 5. gerund check (rule.forbid.gerunds)

**blueprint content scanned:**
- no forbidden gerunds in outline text ✓
- "decode-friction" is a compound noun, not a gerund ✓

**verdict:** no gerund violations.

---

### 6. lowercase preference (rule.prefer.lowercase)

**blueprint status:**
- all content in lowercase ✓
- only code constructs capitalized (as expected) ✓

**verdict:** follows lowercase convention.

---

## issues found

### none

all mechanic standards checked:
1. file name conventions: follows extant ✓
2. directory placement: correct ✓
3. content structure: follows header pattern ✓
4. term consistency: no conflicts ✓
5. gerund check: clean ✓
6. lowercase preference: followed ✓

---

## why it holds

the blueprint follows mechanic role standards because:

1. **file names mirror extant**: checked against `rule.require.solve-at-cause.md`, `philosophy.domain-as-a-garden.[philosophy].md`
2. **placement matches extant**: architect briefs to `practices/`, mechanic briefs to `readable.narrative/`
3. **structure follows pattern**: H1 + H2 sections with dot prefix
4. **terms are coherent**: new terms don't overload extant vocabulary

r5 and r6 already fixed the one deviation (removed [define] tag).

---

## summary

role standards adherance verified. no violations found.
