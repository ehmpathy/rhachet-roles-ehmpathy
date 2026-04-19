# self-review: has-consistent-conventions

## name choices reviewed

### 1. SCOPE_MODE, SCOPE_PATTERN

**extant convention:** skill uses SCREAMING_SNAKE_CASE for globals
- WHAT, WHEN, SCOPE (line 216-218)
- RESNAP, THOROUGH (line 219-220)
- LOG_MODE, LOG_BASE, LOG_DIR (lines 56, 221, 374)
- REST_ARGS (line 224)

**my names:** SCOPE_MODE, SCOPE_PATTERN

**verdict:** holds - follows extant SCREAMING_SNAKE_CASE convention

### 2. scope qualifier syntax: `path()`, `name()`

**extant patterns:** no similar qualifier syntax in this skill

**similar patterns elsewhere?**
- `git.repo.get` uses `@scope/org/repo` syntax
- no `func()` style qualifiers found

**is this new convention?** yes

**is it consistent with broader conventions?** 
- function call syntax is familiar
- used in many CLIs (e.g., `git log --format='%H'`)

**verdict:** holds - new syntax but familiar pattern

### 3. "blocked" vs "constraint"

**my message:** `"blocked: raw --testNamePattern detected"`

**extant messages:**
- line 147: `"error: $config_file not found"` with status "constraint"
- line 358: `"error: invalid type"` 
- line 782: `"error: no tests matched scope"`

**issue found:** I used "blocked" but extant pattern uses "error" or just prints the constraint without prefix

**verdict:** minor inconsistency - "blocked" is clearer for this use case. the ✋ emoji and exit code 2 already signal constraint.

### 4. coconut tip emoji: 🥥

**extant emojis:**
- 🐢 turtle header
- 💤 inflight
- 🎉 passed
- ✋ blocked
- 💥 malfunction
- ⏱️ timeout

**new:** 🥥 for tip

**verdict:** holds - new emoji for new feature (tip), consistent with emoji-enhanced output style

## summary

| name | convention | verdict |
|------|------------|---------|
| SCOPE_MODE, SCOPE_PATTERN | SCREAMING_SNAKE_CASE | holds |
| path(), name() syntax | new, familiar pattern | holds |
| "blocked" prefix | minor divergence from "error" | acceptable |
| 🥥 coconut tip | new emoji | holds |

no convention issues found that require fix.
