# research: auto-approve suspicious permission prompts via the PermissionRequest hook

## .what

hard-won findings (2026-08-14, claude-cli **2.1.87**) on whether a hook can auto-decide the
permission prompts that claude's suspicious-syntax classifier raises — and exactly how. this
is the companion to `research.claude-code-suspicious-syntax.md` (which enumerates WHAT trips
the classifier); this brief records HOW to answer the prompt it raises from a hook.

pairs with the live spike at `.behavior/v2026_08_14.fix-privs-prompts/probe/`.

## .the headline

on 2.1.87, a `PermissionRequest` hook **can** suppress a suspicious prompt — but ONLY with
the **nested** decision schema. the flat `permissionDecision` shape (the shape the community
workaround and older notes propose) does **NOT** work on 2.1.87. this schema drift is why
prior attempts reported "allow does not stick."

### ✅ the shape that works (nested)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": { "behavior": "allow" },
    "reasoning": "why"
  }
}
```

`behavior` is `"allow"` or `"deny"`. to **escalate** (let the human prompt fire), emit **no
stdout** and `exit 0`.

### ❌ the shape that FAILS on 2.1.87 (flat)

```json
{ "hookSpecificOutput": { "hookEventName": "PermissionRequest", "permissionDecision": "allow" } }
```

this looks like success but the prompt still fires. do not use it on 2.1.87.

## .the measurement trap (read this before you test)

a hook is **blind to the prompt**. when a command runs, the hook cannot distinguish
"my decision auto-approved it" from "the human clicked approve." both look identical.

- **the reliable oracle** is the harness transcript line `Allowed by PermissionRequest hook`,
  which appears ONLY when the hook's decision actually suppressed the prompt.
- "the command ran" is NOT proof. an early test in the spike logged a false positive for the
  flat schema because the human approved by hand without the tester aware of it.
- to prove a decision sticks: emit it, then confirm the `Allowed by...` line — or run a
  **negative control** (a `logonly` hook that emits no decision) and confirm the prompt DOES
  appear, so the decision is isolated as the cause.

## .other proven facts on 2.1.87

- **the hook DOES fire** for a suspicious-classified command (e.g. `rhx sedreplace --old
  'foo(bar)' ...` — the parens trip it).
- **suspicious syntax OVERRIDES the `permissions.allow` bypass.** an allowlisted command
  (`rhx:*`) with suspicious syntax still reaches `PermissionRequest`; a NON-suspicious `rhx
  list` fires only `PreToolUse` and never reaches the seam. so the allowlist-bypass rule
  ("allowlisted tools skip the hook") holds only for non-suspicious commands.
- **event order is `PreToolUse` → `PermissionRequest`.** a `PreToolUse` hook that exits 2
  hard-blocks BEFORE `PermissionRequest` is ever reached (this is how the repo's
  `forbid-suspicious-shell-syntax` hook preempts the injection forms).
- **`.claude/settings.json` hot-reloads** — a new/edited hook fires without a session restart.
- **latency**: a fast hook answered well under any ~2s race threshold. the #12176 race (does
  a slow hook lose its decision?) is only a concern for a SLOW decider (e.g. an llm call); it
  was probed at 3s but the result depends on a human's prompt-vs-silent read.

## .the design this unlocks — an in-hook decider (no reviewer clone needed)

you do NOT need a warm reviewer clone to auto-decide. the hook process is yours; decide in it.
the control stack composes (in precedence order):

```
settings.deny   → PreToolUse forbid-suspicious → PermissionRequest decider → settings allow/ask/default
(grep/ls/find/    ($() ` <( > redirect = exit 2   (clean single rhx = allow;   (rhx:* = allow,
 git commit)       hard block)                      unquoted chain = deny;       chmod/npm i = ask)
                                                     else = lift to a brain)
```

- the super-suspicious **injection forms** (`$()`, backticks, `<()`, `>`) are already
  hard-blocked upstream — they never reach the seam.
- what reaches the seam is the benign-but-flagged tail. a deterministic decider clamps it.

### the decider algorithm (default-deny, quote-aware)

1. strip **both single- and double-quoted spans** (backslash-escape aware) to get the
   shell-active "residue" (a metachar inside a quoted span is inert data — an arg — not a
   second command). single-quote-only is **UNSOUND**: an apostrophe inside a double-quoted
   arg (`"it's a test"`) throws off single-quote parity and lets a later `$(...)` read as
   inert — the exact bypass that cost 5+ review rounds to close (see the redteam section).
2. residue has an unquoted chain char (`;` `&` `&&` `||` newline) → **deny** (it runs a 2nd
   command).
3. residue is a **privilege-escalation `rhx` subcommand** (a self-grant of commit quota or
   level: `git.commit.uses set`, `git.commit.bind set|del`) → **deny**. this echoes
   `settings.json`'s `permissions.deny` as an in-hook backstop, because suspicious syntax
   OVERRIDES the allow bypass (proven) and the symmetric deny-vs-seam order was never
   verified — so a suspicious-flagged escalation command could reach the seam, and the decider
   must never auto-approve it.
4. else, a clean single `rhx` / `npx rhachet` call with no residue metachar (no `|`, `<`,
   `>`, `(`, `)`, `$`, backtick) → **allow** (rhx skills are safe by design; it already
   passed the allowlist nudge).
5. else → **lift**: emit no output, a brain decides (human now, an inline haiku later).

reference implementation + a composite clamp test (settings + both hooks, 20 ordinary + 14
redteam cases, security invariant "no adversarial command auto-approves") live at
`.behavior/v2026_08_14.fix-privs-prompts/probe/`.

### redteam holes to guard against (found the hard way)

a naive decider misses real vectors that are NOT hard-blocked upstream:

- a **bare `&`** (background) — `rhx foo & rm -rf ~` runs `rm`.
- a **literal newline** — `rhx foo\nrm -rf ~` runs `rm`.
- an **apostrophe-in-double-quote + injection** — `rhx foo --arg "it's a test" $(rm -rf ~)`.
  the forbid hook's own parser is single-quote-only, so the unpaired `'` throws off its
  parity and lets the `$(` slip PAST the upstream hard-block to the seam. a single-quote-only
  decider would then see the `$(` as quoted-inert and **auto-approve** it. the both-quote-aware
  residue keeps the `$(` active and **lifts** it (never auto-approves) — so the auto-approve
  invariant holds even on the forbid hook's blind spot; only defense-in-depth degrades
  (hard-block → human prompt). this was THE single most-fixed defect across the trail.
- a **privilege-escalation `rhx`** with quoted parens — `rhx git.commit.uses set --quant 999
  --note 'x(y)'`. the parens trip the classifier so it reaches the seam; the residue is a
  clean single `rhx` call, so a decider WITHOUT the step-3 carve-out would auto-approve a
  self-grant of commit quota. step 3 denies it.

the default-deny, both-quote-aware, escalation-carve-out algorithm above catches all four.
always redteam a permission decider with background, newline, subshell, quote-nest,
apostrophe-parity, and privilege-escalation payloads.

## .checklist for anyone who extends this

- [ ] use the **nested** schema; never the flat one on 2.1.x.
- [ ] verify with the `Allowed by PermissionRequest hook` line, never "the command ran."
- [ ] keep a **negative control** (logonly) test to prove the decision is the cause.
- [ ] make the decider **default-deny**: approve only what you can prove safe.
- [ ] strip **both** single- and double-quoted spans before you scan for chain chars
      (single-quote-only is unsound — the apostrophe-in-double-quote bypass).
- [ ] deny privilege-escalation `rhx` subcommands in-hook as a backstop to `permissions.deny`
      (suspicious syntax overrides the allow bypass; the deny-vs-seam order is unverified).
- [ ] redteam with `&`, newline, subshell, apostrophe-parity, privilege-escalation, and
      pipe-to-shell payloads.
- [ ] a slow (llm) decider must be checked against the #12176 race before trust.

## .sources

- live spike + evidence: `.behavior/v2026_08_14.fix-privs-prompts/probe/findings.md`
- the classifier triggers: `research.claude-code-suspicious-syntax.md`
- claude hooks docs: https://code.claude.com/docs/en/hooks
- schema-drift context: github #30435 (flat-shape community workaround), #12176 (race)
