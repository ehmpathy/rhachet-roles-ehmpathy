# self-review: has-questioned-assumptions

## assumption 1: `/tmp/claude-{uid}/` is the pattern claude code uses

**evidence?** the wish shows `/tmp/claude-1000/...` as the path. the `1000` is likely the unix uid.

**what if opposite?** if claude uses a different pattern, our allow rule wouldn't match.

**did wisher say?** yes, the example path shows `/tmp/claude-1000/`.

**exceptions?**
- different systems might use different uid values → but `claude-*` glob handles that
- claude code might change the pattern in future → but that's a future problem

**verdict: holds** ✓ - the glob `/tmp/claude*` is broad enough

---

## assumption 2: `.temp/` is the repo-local scratch convention

**evidence?** this is ehmpathy convention. .temp/ is gitignored and used for scratch.

**what if opposite?** if .temp/ isn't standard, the nudge would cause confusion.

**did wisher say?** "in favor of .temp/" - yes, explicitly.

**exceptions?** some repos might use different scratch conventions → but we're in ehmpathy scope

**verdict: holds** ✓ - wisher explicitly named .temp/

---

## assumption 3: block /tmp writes won't break workflows

**evidence?** mechanic should use .temp/ for scratch. /tmp is for system temp.

**what if opposite?** if extant skills write to /tmp, they'd break.

**did wisher say?** implied by "in favor of .temp/"

**exceptions?**
- need to audit: do any skills write to /tmp?
- test-fns? → already addressed: child processes aren't affected by hooks

**action needed:** audit skills for /tmp writes before we proceed

**verdict: needs validation** ⚠️

---

## assumption 4: Read tool can read from /tmp

**evidence?** Read tool reads arbitrary absolute paths.

**what if opposite?** if Read can't access /tmp, auto-allow is moot.

**did wisher say?** no, but the example shows `tail` (Bash) not Read tool.

**exception found:** the wish shows `tail -50 /tmp/claude*` - that's Bash, not Read tool.

**insight:** the auto-allow is primarily for Bash commands (`cat`, `tail`, `head`), not the Read tool. but Read tool should also be allowed.

**verdict: holds** ✓ - both Bash and Read should auto-allow reads

---

## assumption 5: hooks can intercept /tmp access

**evidence?** hooks receive tool calls with file paths.

**what if opposite?** if hooks don't see /tmp paths, we can't allow/block.

**did wisher say?** no, this is implementation detail.

**exceptions?**
- Bash tool: command string contains path → need regex to extract
- Read tool: file_path field → straightforward
- Write/Edit: file_path field → straightforward

**complexity:** Bash commands are strings. need regex to detect `/tmp` in command.

**verdict: holds but complex** ✓ - feasible, but Bash parse needs care

---

## assumption 6: auto-allow means "don't prompt"

**evidence?** wish says "stop asked for permissions"

**what if opposite?** "auto-allow" could mean other behavior.

**did wisher say?** "should be auto allowed" vs "auto blocked"

**verdict: holds** ✓ - auto-allow = no permission prompt, proceed silently

---

## summary

| assumption | evidence | verdict |
|------------|----------|---------|
| /tmp/claude-{uid}/ pattern | wish example | holds |
| .temp/ is scratch convention | wish explicit | holds |
| block writes won't break workflows | implied | **needs validation** |
| Read tool can access /tmp | logical | holds |
| hooks can intercept /tmp access | feasible | holds (complex for Bash) |
| auto-allow = no prompt | wish words | holds |

### action items

1. **audit skills for /tmp writes** before implementation
2. **design Bash regex** to extract /tmp paths from command strings
