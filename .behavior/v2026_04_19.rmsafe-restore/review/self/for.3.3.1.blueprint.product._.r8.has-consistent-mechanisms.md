# self-review r8: has-consistent-mechanisms

deeper search for patterns that might be duplicated or inconsistent.

---

## additional searches

### ensure_ function pattern

**search:** `ensure_` in src/domain.roles/mechanic/skills/
**found:** none

**analysis:** no extant `ensure_*` helper pattern. blueprint's `ensure_trash_dir()` is a new internal function name.

**verdict:** holds — no name collision, follows verb_noun pattern

### .claude vs .agent cache location

**search:** `.claude` in sedreplace.sh
**found:** `find_claude_dir()` creates `.claude` in git root for nudge files

**analysis:** two cache locations in codebase:
- `.claude/` — claude-specific state (sedreplace nudges)
- `.agent/.cache/...` — structured role/skill cache path

blueprint uses `.agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash/`

**verdict:** holds — semantically different locations:
- `.claude` = claude tool state
- `.agent/.cache/...` = structured cache hierarchy with repo/role/skill path

the wish explicitly specified the `.agent/.cache/` path structure.

### trash/cache patterns elsewhere

**search:** `trash|cache` in src/
**found:** 45 files, all unrelated (LLM cache, npm cache, etc.)

**analysis:** no extant trash directory pattern. this is a new feature.

**verdict:** holds — first implementation of trash pattern

---

## found issues

none — deeper search confirms no duplicated mechanisms.

---

## non-issues (why they hold)

| concern | why it holds |
|---------|--------------|
| ensure_ name | no extant pattern, new function |
| .claude vs .agent | semantically different purposes |
| cache location | wish specified path, follows .agent hierarchy |
| trash pattern | first implementation, no extant to reuse |

---

## conclusion

r8 confirms r7 findings. blueprint introduces new mechanisms that:
1. follow extant inline patterns (mkdir -p, cp -P)
2. extend extant structures (output.sh print_ functions)
3. use appropriate locations (.agent hierarchy per wish)

no duplication. no inconsistency.
