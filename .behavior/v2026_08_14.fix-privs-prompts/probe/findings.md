# probe findings — does the suspicious `PermissionRequest` hook fire, and does `allow` stick?

**version proven**: claude-cli **2.1.87** (`/home/vlad/.local/share/pnpm/global/5/.pnpm/@anthropic-ai+claude-code@2.1.87/...`) — the wish's exact target.

**date**: 2026-08-14
**permission_mode at probe time**: `acceptEdits`

---

## the scaffold

- `probe/hook.detect.sh` — reads hook stdin, appends one jsonl record to `probe/fired.log`
  (ts, event, tool, mode, tool_input), and on `PermissionRequest` emits a decision whose
  shape is chosen by `probe/mode`: `logonly` (no decision), `flat`, `nested`, `deprecated`,
  `both`, or `slow`.
- registered in `.claude/settings.json` on two events: a log-only block on `PreToolUse`
  (Bash) and a log+decide block on the new `PermissionRequest` (Bash).
- to let a suspicious command reach claude's native classifier, the repo's own
  `pretooluse.forbid-sedreplace-special-chars` hook was **temporarily disabled** (it is a
  preemptive exit-2 block for exactly this syntax). **must be restored.**

## the trigger

`rhx sedreplace --old 'foo(bar)' --new 'baz' --glob 'src/**/*.ts' --mode plan`

`rhx sedreplace` matches `permissions.allow` (`rhx:*`), but the **parens** are a
suspicious-syntax culprit.

## the evidence (`probe/fired.log`)

```
1  PreToolUse       pwd                                         (hot-reload proof)
2  PreToolUse       rhx sedreplace ...foo(bar)...   (1st try — blocked at PreToolUse by repo hook)
3  PreToolUse       rhx sedreplace ...foo(bar)...   11:20:20.192   (retry, repo hook disabled)
4  PermissionRequest rhx sedreplace ...foo(bar)...  11:20:20.733   ← FIRED
```

after line 4, the command **executed** (sedreplace plan output rendered) with **no user
prompt**.

---

## the measurement trap (why an early reading was wrong)

the hook process is **blind to the prompt**. when a command runs, the hook cannot tell
"auto-approved by my decision" from "the human clicked approve" — both look identical (the
command executes). an early `approve`-mode read was a **false positive**: the command ran
because the human approved it by hand, not because the flat-schema `allow` suppressed the
prompt.

the reliable oracle is the **harness's own transcript line** `Allowed by PermissionRequest
hook`, which appears only when the hook's decision actually suppressed the prompt. every
verdict below rests on that line (or on the human's explicit report of a prompt vs silence),
never on "the command ran."

## what is proven on 2.1.87

1. **the `PermissionRequest` hook FIRES for a suspicious-classified command** (log lines
   15/18/21). it does fire. (Q1 = yes.)

2. **suspicious syntax OVERRIDES the `permissions.allow` bypass.** `rhx sedreplace` is
   allowlisted, yet the parens routed it to `PermissionRequest` anyway. contrast: `rhx list`
   (non-suspicious) fired ONLY `PreToolUse`, never `PermissionRequest`, and ran silently
   (log line 13). so the seam is reached ONLY by suspicious syntax; normal `rhx` commands
   ride the `rhx:*` allowlist untouched. (specificity confirmed.)

3. **an `allow` decision SUPPRESSES the prompt — but ONLY with the correct schema.**
   proven by the harness line `Allowed by PermissionRequest hook`. (Q0 = yes, schema-gated.)

4. **SCHEMA MATTERS — the NESTED shape works, the FLAT shape does not** (on 2.1.87):

   | schema | shape | result |
   |--------|-------|--------|
   | flat | `{hookSpecificOutput:{...,permissionDecision:"allow"}}` | ❌ prompt STILL fired — human had to approve by hand |
   | **nested** | `{hookSpecificOutput:{...,decision:{behavior:"allow"}}}` | ✅ `Allowed by PermissionRequest hook` — silent |

   this is the crux. the flat `permissionDecision` shape — the one the repo's own research
   brief (`research.claude-code-suspicious-syntax.md:117-147`) AND the wish proposed — is the
   **WRONG shape on 2.1.87**. it was **schema drift**, not "decision ignored." (Q2 = NESTED
   `decision.behavior`. this also explains why prior tests reported "allow does not stick" —
   prior tests used the flat shape.)

5. **event order: `PreToolUse` → `PermissionRequest`.** `PreToolUse` hooks preempt — which is
   why the repo's exit-2 `forbid-sedreplace-special-chars` (a PreToolUse hook) blocked the
   1st attempt before `PermissionRequest` was ever reached (log line 2).

6. **the live session HOT-RELOADED `.claude/settings.json`** — the new hooks fired with no
   restart (log line 1).

7. **negative control PASSED**: with the hook in `logonly` mode (fires, emits no decision),
   the same suspicious command DID raise a prompt (human reported an approve/reject by hand,
   log lines 7-8 and 10-11). this proves the suppression is caused by the emitted decision,
   not by an acceptEdits quirk.

8. **the DECIDER is default-deny and redteam-clean**. the composite clamp test
   (`permissionrequest.clamp.integration.test.ts`, 50/50 pass) composes ALL permission
   controls — settings deny/allow/ask + the forbid hook + the decider — and pins the verdict
   for 20 ordinary + 14 adversarial commands. the security invariant (NO adversarial command
   auto-approves) holds for all 14. redteam FOUND TWO REAL HOLES in the first decider — a bare
   `&` (background) and a newline both chain a second command and neither is hard-blocked
   upstream; the hardened default-deny decider (strip single-quoted spans, then deny on any
   unquoted `; & newline`, approve only a clean single rhx call) now catches both.

---

## the race test (Q4) — result: PENDING HUMAN OBSERVATION

`slow` mode (sleep 3s, then the PROVEN nested allow) fired on 2026-08-14T13:56:00 for
`rhx sedreplace --old 'race(test)' ...` (fired.log lines 44-45). the hook is blind to the
prompt, so the outcome depends on the human's report:

- **ran silently** → NO race at 3s → an inline haiku call (~1-2s) is viable in the hook.
- **prompted / had to approve** → the ~2s #12176 race is REAL → haiku needs a faster model or
  a pre-warm.

> record the human's observation here once given. this gates the haiku-layer dream.

## controls still not run

- **seam alternative (Q3)**: the same nested allow via a `PreToolUse` hook (the repo's
  documented bypass) was not separately measured — `PermissionRequest` sufficed.
- **deprecated / both schemas**: `deprecated` (top-level `decision:approve`) and `both` modes
  are wired but not measured — nested already succeeded, so these are optional.
- **DENY live behavior (open empirical item)**: the probe proved the nested `allow` verdict
  SUPPRESSES the prompt on 2.1.87. the live behavior of the nested `deny` verdict was NOT
  separately traced — whether it cleanly blocks, or falls back to a human prompt. this is the
  branch that fires on command-chains and privilege-escalation subcommands, so its live
  behavior is worth a dedicated trace.
  - **why it is not a safety hole meanwhile**: the decider's DENY is fail-safe by construction.
    if `deny` does not block as intended, the worst case is claude-cli falls back to the human
    prompt (the same "before" state) — a DENY can never DOWNGRADE to an auto-approve. so an
    unproven deny path is a defense-in-depth question (does it hard-block, or defer to a human?),
    not an auto-approve risk.
  - record the human's prompt-vs-block observation here once a `deny`-mode probe is run.

- **does a DENY's reason reach the denied agent? (open empirical item)**: the `reason` label
  in the emit is a cosmetic field — only `decision.behavior` is proven to drive suppression.
  the vision's case-2 testdrive promises the denied agent learns "run each command as its own
  call" and self-corrects, but that rests on claude-cli's return of the reason back into the
  tool result the model reads — never traced. if it does NOT, an unattended agent that hits a
  legitimate `rhx foo && rhx bar` meets a silent wall with no hint.
  - **why it is not a safety hole meanwhile**: a silent deny is no worse for SAFETY than the
    "before" human-prompt state; it is a G1-autonomy/UX question for the deny path, not an
    auto-approve risk. the allow path's autonomy (the `Allowed by PermissionRequest hook`
    line) was traced; the deny path's UX was not.
  - the fix if it proves silent is a phase-2 concern (a viewer, or a reason surfaced another
    way), not a phase-1 code change — recorded here so it is a named risk, not an assumed win.

## durable risks (inherent, not closeable by more tests here)

- **external-contract drift has zero regression signal**: two foundational facts — "suspicious
  syntax overrides `permissions.allow`" and "an allowlisted tool never reaches
  `PermissionRequest`" — rest on a single manual probe on ONE claude-cli version (2.1.87). the
  decider + compose tests pin THIS repo's logic, never claude-cli's own route evaluation, so a
  future claude-cli that silently changes this precedence cannot be caught by the suite. this
  is inherent to a hook on an undocumented external CLI. it is NOT covered by the green tests,
  and must be re-probed on each claude-cli bump — named here so "tests green" is never read as
  "the route precedence still holds." the `.integration.test.ts` allow/deny snapshot is the
  early-warn for the OUTPUT schema drift only, not the route precedence.

## cleanup owed

- restore `pretooluse.forbid-sedreplace-special-chars` in `.claude/settings.json`.
- remove (or neutralize) the probe's `PermissionRequest` detect block once probes are done —
  while active in a non-`logonly` mode, it auto-decides suspicious commands in this session.
