# self-review r2: has-questioned-assumptions (deeper)

## missed assumption: WHO is prompted?

the wish says "we need to stop asked for permissions"

who is "we"? the HUMAN. the permission prompts are claude code ask the human to approve tool calls.

this means:
- "auto-allow reads" = add permission rule so human isn't prompted
- "auto-block writes" = hook that blocks so human isn't even asked

**these are TWO DIFFERENT mechanisms!**

my vision conflated them into "hooks only". that's wrong.

**issue found:** vision proposes hooks for both, but reads need permission rules.

**fix:** update proposed behavior:
- reads: `permissions.allow` in settings.json
- writes: PreToolUse hook with exit 2

---

## missed assumption: commands vs paths

current permissions are command-based, not path-based:
```
[p]: cat    # allows cat ANYTHING
[p]: tail   # allows tail ANYTHING
```

but `cat /tmp/claude*` vs `cat /home/file` are treated the same.

wait - then why would the human be prompted for `tail /tmp/claude*`?

possible reasons:
1. sandbox restrictions for paths outside repo
2. the command isn't actually allowed (not in permission list)
3. claude code has path-based rules we don't know about

**action needed:** research claude code's sandbox behavior for /tmp paths

---

## missed assumption: is /tmp in sandbox?

claude code has a sandbox. does /tmp trigger prompts?

see the wish example path:
```
/tmp/claude-1000/-home-vlad-git-ehmpathy--worktrees-rhachet-roles-ehmpathy.../tasks/...
```

this is OUTSIDE the repo directory. sandbox might restrict access to paths outside repo root.

if so, the fix isn't just permissions - it's sandbox configuration or hooks.

**question for wisher:** is this a sandbox issue or permission issue?

---

## missed assumption: separate mechanisms for read vs write

my vision says "hooks for both". but:

| behavior | mechanism |
|----------|-----------|
| auto-allow reads | permission allow rule OR sandbox exception |
| auto-block writes | PreToolUse hook (exit 2) |

these are fundamentally different:
- allow = add to allowlist (no prompt, proceed)
- block = hook that rejects (don't proceed)

**issue found:** vision treats them as same mechanism

**fix:** clarify that reads need allowlist/sandbox, writes need block hook

---

## verified assumption: .temp/ convention

checked: .temp/ is ehmpathy convention for repo-local scratch. this holds.

---

## verified assumption: child processes unaffected

hooks intercept tool calls. child processes (test-fns, etc) write via OS syscalls, not tools. hooks won't affect them. this holds.

---

## summary of issues found

| issue | status | fix needed |
|-------|--------|------------|
| conflated allow and block mechanisms | found | update vision to separate |
| unclear if sandbox or permissions | found | research needed |
| command-based vs path-based permissions | found | research needed |

### action before proceed

1. research: does claude code sandbox /tmp paths?
2. research: can permissions be path-specific?
3. update vision with separate mechanisms for read-allow vs write-block
