# rule.forbid.native-subagents

## .what

never spawn a native subagent (the claude-code `Task` / `Agent` tool). do the work inline,
with `Grep`, `Glob`, `Read`, and `Bash` directly.

this covers every flavor: research, exploration, "parallel" fan-out, background delegation.
there is no read-only carve-out — research is the case that bites hardest.

## .why

### 1. it costs more tokens than the work it replaces

a subagent does not share the parent's context. so it re-reads what the parent already holds,
burns a full window of its own, then hands back a summary the parent must read a third time.

⇒ one read becomes two reads plus a summary. the delegation is sold as a context saver and is
a context multiplier.

### 2. 🔴 the summary launders unverified claims

this is the sharp harm, and it is measured rather than argued.

**2026-09-13, this repo, behavior `v2026_09_09.fix-hook-fork-storm`:** a subagent was asked to
review the diff for architectural defects. it reported that `TALLIED` in
`pretooluse.forbid-terms.forkbudget.integration.test.ts` was *"asymmetrically closed"* — that
a future hook could blow the fork budget with the suite still green.

that claim was graded a **blocker** in peer review `i019-r011` and held stone
`5.1.execution.from_vision`.

the guard it called absent sits at `forkbudget.integration.test.ts:624`:

```ts
then('every command either hook reaches is TALLIED', () => {
  expect(asReachedTools().filter((tool) => !TALLIED.includes(tool))).toEqual([]);
});
```

it had been raised by peer `i010-r011` and repaired. the residual bound is declared in a note
at `:625-635`. **a second blocker from the same summary collapsed the same way.**

⇒ the parent graded two blockers on prose it never checked against the file, because the
subagent's output *reads* like a verdict and carries no line to check. a direct `Grep` would
have shown line 624 in one call.

### 3. it defeats `rule.require.trust-but-verify` by construction

that rule says verify inherited claims before you act. a subagent's report **is** an inherited
claim — but the parent cannot verify it without a full repeat of the read, and the whole
premise of the delegation was to skip that read.

⇒ so the parent either re-does the work (the delegation saved naught) or trusts it blind (the
defect above). there is no third branch.

## .the test

> "am I about to spawn a `Task` / `Agent`?"

yes → **stop.** run the `Grep` / `Glob` / `Read` yourself. there is no second question.

## .instead

| the pull | the move |
|---|---|
| "this search is broad, delegate it" | `Grep` with a tighter pattern. broad ≠ delegable |
| "I want two things at once" | two tool calls in one block. the harness already parallelizes |
| "my context is tight" | narrow the read (`offset`/`limit`, `head_limit`), never outsource it |
| "I need a second opinion" | enroll a peer **role** (`rule.always.get-a-second-opinion-before-foreman`), which mints a reviewable artifact |

🟡 note the last row: a peer role review is **not** a native subagent. it draws budget, writes
a `.given` the engine reads, and gates a stone. a native subagent writes naught the system can
audit. that difference is the whole rule.

## .enforcement

- a native `Task` / `Agent` spawn = **blocker**
- a claim cited from a subagent report, with no direct file read behind it = **blocker**
  (`rule.require.trust-but-verify`)

⇒ enforcement is owed **systemically**, via a PreToolUse hook that denies the `Task` tool
outright rather than by memory of this brief. tracked as a dispatched task; until that hook
lands, this brief is the only guard and it is a weak one.

## .see also

- `rule.require.trust-but-verify` (mechanic) — the rule a subagent report structurally evades
- `rule.always.get-a-second-opinion-before-foreman` (driver) — the sanctioned alternative
- `rule.forbid.hand-run-reviews` (driver) — the same shape: an instrument outside the system,
  whose output gates naught
