# howto: triage a "why was i asked / blocked for a clearly-safe command" complaint

## .what

the playbook for when a human says "that command was clearly safe — why did the
harness ask me / block it / not auto-approve it?". it names the FIVE gates a bash
command crosses, shows how to find WHICH gate fired, and gives the correct fix per
gate — so a similar complaint never needs a fresh investigation.

pairs with `research.permissionrequest-hook-auto-approve.md` (HOW the seam
decides), `define.why-permission-guards-allowlist-all-rhx.[article].md` (WHY the
seam allowlists rhx by shape), and `research.claude-code-suspicious-syntax.md`
(WHAT trips claude-cli's own classifier).

## .the five gates, in order

a bash command Claude runs crosses these, top to bottom. the FIRST that objects
wins:

| # | gate | owner | what it objects to | signal |
|---|------|-------|--------------------|--------|
| 1 | `pretooluse.forbid-suspicious-shell-syntax.sh` | us | injection forms: `$()`, backtick, `<()`, `>`/`>>`, `2>&1`, `$'…'` | hard-block, exit 2, stderr "BLOCKED: Command contains …" |
| 2 | `pretooluse.check-permissions.sh` | us | a compound whose SEGMENTS (split on `&& \|\| \| ;`) are not all in the allowlist | HARDNUDGE: blocks 1st try, allows retry; stderr "BLOCKED: not covered by … permissions" |
| 3 | claude-cli suspicious classifier | claude-cli | `&&`, `\|`, quoted flags, newlines, parens — see `research.claude-code-suspicious-syntax.md` | raises a `PermissionRequest` prompt |
| 4 | `permissionrequest.decide-permissions.sh` (the seam) | us | a compound whose segments are not all clean-rhx-or-allowlisted (per its producer/sink bars) | allow / deny / lift(=human prompt) |
| 5 | `settings.json` allow/ask/deny | claude-cli | its own permission rules | prompt or run |

gates 1, 2, 4 are OUR shell hooks in
`src/domain.roles/mechanic/inits/claude.hooks/`. gates 3 and 5 are claude-cli's
own, which we do not control.

## .step 1 — read the stderr, it names the gate

each of our gates prints a distinct banner. match it:

- **"Command contains output redirection (>)"** / mentions `2>&1`, `$()`, `<(`
  → **gate 1** (forbid). the fix is in the banner's "Alternatives" block
  (e.g. `cmd | rhx teesafe file.txt` instead of `cmd > file`).
- **"not covered by … pre-approved permissions"** + a long `[e]/[p]`
  list → **gate 2** (check-permissions). a segment is not allowlisted. note the
  near-miss traps: only bare `jq` is allowlisted, not `jq -r`; `npm run build`
  is a prefix so `npm run build:x` passes, but an un-listed npm task does not.
- **a permission PROMPT with no stderr banner from us** → **gate 3 → gate 4**.
  the command is allowlisted enough to pass gates 1–2, but claude-cli's
  classifier flagged it (usually `&&` or `|`), and the seam did not auto-approve.
  read `.claude/permission.decisions.local.log` (jq it) — the seam records every
  allow/deny with the exact command and reason. a LIFT writes no log line but
  leaves a stderr breadcrumb — a `🐢 hold up, dude...` mascot, a `🐚
  permissionrequest.decide-permissions` artifact, then the cause leaves (the
  failed segment + which bar, or the `permissions.deny` list for a denied one).

## .step 2 — the usual culprit: a compound command

the most common "but it's clearly safe!" is a compound like:

```
npm run build:… | tail -3 && rhx git.repo.test … --resnap | tail -20
```

every segment here IS allowlisted, so **gate 2 passes**. the `&&`/`|` makes
claude-cli's classifier flag it (**gate 3**), which raises a `PermissionRequest`.
the seam (**gate 4**) then judges each segment by the SAME allowlist gate 2
trusts, and — if every segment clears its bar — auto-approves. the human sees no
prompt. read `.claude/permission.decisions.local.log` to confirm the `allow`.

the human's mental model ("each part is allowlisted, so the whole is safe") is
now the model the seam uses too. the older seam knew only two safe shapes (a lone
rhx call, or `echo|printf|cat | rhx`) and denied everything else — that divergence
was the complaint, and it is fixed.

## .step 3 — the seam's segment bars (why a compound may STILL lift)

the seam splits the compound quote-aware and judges each segment. a segment's bar
depends on its POSITION, and the two bars are NOT the same:

every segment FIRST clears the human's own `permissions.deny` (a denied segment
fails its bar, whatever its shape); then it must clear its position bar:

| position | bar (segment qualifies iff…) | why |
|----------|------------------------------|-----|
| any segment | NOT on the human's `permissions.deny` | the seam honors the human's OWN deny-list, symmetric to the allow-list — a denied grant never auto-approves on shape alone |
| producer (left of `\|`, or a chain segment) | clean-rhx call OR allowlisted | already trusted to run alone; a pipe of its stdout grants no new authority |
| sink (right of `\|`) | clean-rhx call OR a read-only reader (`jq`/`tail`/`head`/`wc`/`cat`) by LEAD token | a sink RUNS on attacker-influenced stdin, so an allowlisted-but-code-exec sink (`npm run`, `bash`) is denied the wider producer bar; a NON-denied clean-rhx sink stays safe — rhx self-protects at execution, not via stdin |

so `rhx … | jq .` and `npm run build:… | tail -3 && rhx … | tail -20` auto-approve
(every producer allowlisted, every sink a reader, none denied). but
`rhx git.repo.get waves | npm run riptide` LIFTS — `npm run` is allowlisted yet is NOT a
read-only reader, so it fails the
narrower sink bar. this producer/sink asymmetry is intentional: same command,
different position, different bar.

**a pipe may have ANY number of stages** — the producer bar applies to stage 0, the
sink bar to EVERY downstream stage. so `rhx … | jq . | tail -20` (the vision's own
3-stage example) auto-approves (each downstream stage a reader). a code-exec sink at
ANY depth still fails: `rhx git.repo.get waves | jq . | npm run riptide` and
`rhx git.repo.get waves | npm run riptide | tail` both LIFT. `grep` is deliberately NOT in the
reader set (it can read files via `-f` / `--include`), so `rhx git.repo.get waves | grep
bar` LIFTS — use `rhx git.repo.get waves | jq`/`tail` to trim, or run the grep as its own
Bash call.

## .the core invariant — rhx is the only auto-approved ACTIVE sink

the sink bar admits exactly two things: a **pure reader** (`jq/tail/head/wc/cat`,
provably inert on stdin) and a **clean-rhx call**. readers cannot act on hostile
stdin, so the ONLY auto-approved sink that ACTS on the bytes it is fed is **rhx**.
that collapses the whole "a sink runs on attacker-influenced stdin" worry to one
invariant:

> the only auto-approved active pipe sink is rhx — therefore rhx (and only rhx)
> must be hardened against hostile stdin.

this is why an allowlisted-but-code-exec sink (`… | npm run riptide`, `… | gh secret set`,
`… | curl reef.evil`) LIFTS even though the command may be on the allowlist: `npm run` /
`gh` / `curl` have no execution-time self-guard, so to admit them as sinks would
spread the hostile-stdin burden onto surfaces nobody promised to harden. rhx already
owns that burden at execution (`define.why-permission-guards-allowlist-all-rhx`), so
it pins the active-sink surface to rhx and adds no NEW obligation — it names the one
that already exists.

**the fix when you hit a sink-bar LIFT:** to pipe INTO a custom sink and have it
auto-approve, don't reach for a raw `npm run` / `gh` / `curl` sink — wrap the behavior
as an **rhx skill** (e.g. under `.agent/repo=.this/role=any/skills`) and guard it
against malicious stdin at execution. then `producer | rhx your.skill` clears the sink
bar as a clean-rhx call, and the guard sits where it belongs. or, for a one-off, run
the sink as its OWN separate Bash call (no pipe → no hostile-stdin channel).

**the deny-honor** closes a real hole: a clean-rhx call the human deny-listed (e.g.
`rhx git.commit.bind set`, whose skill has NO execution self-guard) would otherwise
auto-approve on clean shape. the seam reads `permissions.deny` the same way gate 2's
authority is built, GLOB-aware (so `--org * del` catches any org), and LIFTS the
compound (a chain with a denied segment DENYS). this is NOT a seam-minted denylist
(forbidden by `define.why-permission-guards-allowlist-all-rhx`) — it is honor of the
list the human wrote. so `echo hi | rhx git.commit.uses set …` and
`echo hi | rhx git.commit.bind set …` both LIFT; a NON-denied clean-rhx sink still
auto-approves.

the reader bar keys on the LEAD token, not a whole-command allowlist match, on
purpose: `jq` is an EXACT allowlist entry, so a whole-command match would miss
`jq .` / `jq -c` / `jq -r`. a lead-token match on `jq` accepts all of them.

## .the hard-deny floor (never auto-approved, whatever the segments)

two separators STAY deny even when both halves are individually safe:

- **lone `&`** (`rhx get.wave.report & rhx get.tide.chart`, `rhx get.wave.report &`)
  — a background detaches the command from the gate; the seam cannot prove the tail
  empty.
- **newline / CR** (`rhx get.wave.report\n rhx get.tide.chart`) — the classic
  multi-line injection vector; a newline-joined "compound" is never in scope.

and the injection forms (`$()`, backtick, `<()`, `>`) are hard-blocked upstream at
gate 1 — if one reaches the seam via an apostrophe-parity bypass, the residue keeps
it active, the segment is neither clean-rhx nor allowlisted, and the seam does NOT
approve. this is the redteam corpus in
`permissionrequest.decide-permissions.integration.test.ts`; keep it green on any
change.

## .step 3b — if a safe compound STILL lifts

if the human insists every part is safe yet the seam lifted, check, in order:

1. **is a sink an allowlisted-but-code-exec command?** (`… | npm run riptide`,
   `… | gh secret set`) — that is the sink bar at work, by design. run the second
   command as its own separate Bash call, or wrap it as a stdin-hardened rhx skill
   (see ".the core invariant — rhx is the only auto-approved ACTIVE sink").
2. **is a segment on the human's `permissions.deny`?** (`rhx git.commit.bind set`,
   `rhx git.commit.uses set`) — the deny-honor LIFTS it by design; the human denied
   it. a human who wants it runs it interactively, or removes the deny entry.
3. **is a PRODUCER or STANDALONE segment truly on the allowlist?** grep
   `.claude/settings.json` + `settings.local.json` for the `Bash(…)` pattern. a
   producer/standalone match is a WHOLE-command match, so a near-miss (`git logg`
   for `git log`; an un-listed `npm run` task) fails the bar. the fix is a settings
   grant, not a seam change. (NOTE: this whole-command rule is for a producer/standalone
   segment. a reader SINK is judged by its LEAD token instead — `jq -r`, `jq -c`, `jq .`
   all clear as a sink once bare `jq` is a reader — so a `-r`/`-c` flag is NOT a sink
   near-miss; see item 4 for the sink reader bar.)
4. **is a READER sink missing from EITHER of its two authorities?** a reader sink
   (`… | jq`, `… | wc`) qualifies only if its lead token is BOTH in the seam's
   hardcoded `READERS` set (`jq tail head wc cat`, in
   `permissionrequest.decide-permissions.sh`) AND in the human's settings
   allowlist. this is an AND of two lists, so it narrows from EITHER side:
   - a NEW reader added to settings (e.g. `Bash(grep:*)`) has NO effect as a sink
     until `grep` is also added to the `READERS` literal in the `.sh`.
   - trimming a reader FROM settings (e.g. dropping `wc` in an unrelated cleanup)
     silently narrows sink-safety for `… | wc`, with no other signal.
   to widen the reader set you edit BOTH; to keep one working, keep it in both.
5. **is there a lone `&` or newline?** that is the hard-deny floor — not a bug.

the seam consults the allowlist the human already curates. to widen what
auto-approves, widen the allowlist (a settings edit) — the seam honors it.

## .where the code + tests live

- gates 1/2/4 hooks: `src/domain.roles/mechanic/inits/claude.hooks/`
- seam decider tests (redteam + audit + schema): `permissionrequest.decide-permissions.integration.test.ts`
- composed-stack clamp (forbid → seam precedence): `permissionrequest.compose.integration.test.ts`
- resnap after any hook change: `rhx git.repo.test --what integration --scope 'path://permissionrequest' --mode apply --resnap`
- edits go in `src/…`; run `npm run build:complete:dist` to sync `dist/` (what the runtime `.agent/` symlink serves)

## .see also

- `research.permissionrequest-hook-auto-approve.md` — the nested-schema contract + the seam algorithm
- `define.why-permission-guards-allowlist-all-rhx.[article].md` — why the seam allowlists rhx by shape, not a denylist
- `research.claude-code-suspicious-syntax.md` — what trips claude-cli's classifier (gate 3)
- `sessionstart.notify-permissions.sh` — the boot banner that points humans at the G3 audit log
