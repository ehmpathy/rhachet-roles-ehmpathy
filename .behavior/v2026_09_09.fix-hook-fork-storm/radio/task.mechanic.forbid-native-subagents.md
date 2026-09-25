# feat(hooks): forbid native subagents via a PreToolUse hook

## .what

add a PreToolUse hook to the mechanic role that denies the native claude-code `Task` / `Agent`
subagent tool outright.

the written half already landed — `rule.forbid.native-subagents.[rule].md` in
`.agent/repo=.this/role=any/briefs/`. **this task is the systemic half.** a brief that relies
on an agent to recall it is a weak guard; a hook is not.

## .why

native subagents are a wasteful pattern, and worse, they launder unverified claims.

### 1. token cost

a subagent does not share the parent context. it re-reads what the parent already holds, burns
its own window, then returns a summary the parent reads a third time. ⇒ one read becomes two
reads plus a summary. sold as a context saver, it is a context multiplier.

### 2. 🔴 unverified claims, laundered into verdicts

**measured 2026-09-13, behavior `v2026_09_09.fix-hook-fork-storm`.** a subagent reported that
`TALLIED` in `pretooluse.forbid-terms.forkbudget.integration.test.ts` was *"asymmetrically
closed"* — that a future hook could blow the fork budget with the suite still green.

that claim was graded a **blocker** in peer review `i019-r011` and held stone
`5.1.execution.from_vision`.

the guard it called absent sits at `forkbudget.integration.test.ts:624` — raised by peer
`i010-r011` and repaired long before, with its residual bound declared in a note at `:625-635`.
**a second blocker from the same summary collapsed the same way.**

⇒ the parent graded two blockers on prose it never checked, because a subagent report reads
like a verdict and carries no line to check.

### 3. it defeats `rule.require.trust-but-verify` by construction

a subagent report is an inherited claim the parent cannot verify without a full repeat of the
read — and the premise of the delegation was to skip that read. ⇒ the parent either redoes the
work, or trusts it blind. there is no third branch.

## .the ask

- a PreToolUse hook that matches the `Task` tool and exits 2 with a refusal
- the refusal names the alternative: run `Grep` / `Glob` / `Read` inline, or enroll a peer
  **role** for a second opinion
- 🟡 the refusal must **part a native subagent from a peer role review**. a peer role draws
  budget, writes a `.given` the engine reads, and gates a stone. a native subagent writes
  naught the system can audit. a hook that blurs the two would break
  `rule.always.get-a-second-opinion-before-foreman`
- register it in `getMechanicRole.ts` beside the other PreToolUse hooks, and give it the same
  reachability clamp the peer hooks carry, so a wrong path cannot silently retire the gate
- carry the fork-budget discipline of the peer hooks — this gate needs one `jq` read of
  `tool_name` and no more

## .the bound

do **not** ride this into `v2026_09_09.fix-hook-fork-storm`. that wish bounds itself to the two
forbid-terms hooks and states plainly: *"do not touch the other PreToolUse hooks unless … say
so plainly rather than expand the diff quietly."*

a new hook ripples into `getMechanicRole.ts`, its snapshot, the hooks-reachable integration
test, and a `settings.json` regeneration — every one of those files is under active review on
that drive. ⇒ SAFE ✅ · CLEAN 🔴. this is a separate behavior.
