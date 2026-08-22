# define.why-permission-guards-allowlist-all-rhx

## .what

the permission seam (the `PermissionRequest` decider,
`permissionrequest.decide-permissions.sh`) auto-approves **any clean single
rhx / npx-rhachet call**, and — more generally — **any compound whose every
segment is independently safe** (a `|`/`&&`/`||`/`;` command where each producer
is clean-rhx-or-allowlisted and each pipe sink is clean-rhx-or-a-read-only-reader).
it does NOT denylist specific rhx subcommands — no carve-out for
`git.commit.uses set`, `keyrack unlock`, `set.package.install`, or any other
"dangerous" skill. the whole rhx namespace is allowlisted **by shape**: lead with
rhx, no shell-active metachar in the residue, and the seam approves.

for a NON-rhx segment, the authority is the human's OWN curated Bash allowlist —
the exact `Bash(...)` patterns (union of `settings.json` + `settings.local.json`)
that gate 2 (`pretooluse.check-permissions.sh`) already trusts. the seam mints no
allowlist and no denylist of its own; it reads the human's. it also HONORS the
human's `permissions.deny` set symmetrically: a segment that matches a deny
pattern never auto-runs (a deny match is glob-aware and fail-safe — an over-match
lifts to the human rather than approve).

## .why

**rhx is an open-ended, glob-like namespace.** new skills land constantly. a
decider cannot know which subcommands are dangerous without an enumerated list
that goes stale the moment a skill is added. a denylist here implies a safety we
do not have — "we know the dangerous ones" — when in truth we cannot.

**a denylist is unsound at this layer.** bash expands brace `{ }`, glob `[ ] * ?`,
tilde `~`, and line-continuation BEFORE exec, so a literal-text scan of the
command misses a token that still resolves to a denied subcommand at run. a
red-team pass found real cases where a denied token slipped a denylist while bash
still ran the grant. an allowlist-by-shape (a clean single rhx call) has no such
blind spot.

**the seam guards the wrong question for "is this operation dangerous".** the
seam sees a PROMPT; it does not see the run. the RIGHT layer to decide whether a
sensitive operation is allowed for a given caller is **execution** — the skill
self-guards inside its own executable (e.g. a human-only gate on a commit-quota
grant). so the seam delegates that decision to where it belongs, and keeps only
the questions a prompt-level gate CAN answer soundly.

## .the division of responsibility

| layer | the question it answers | mechanism |
|-------|-------------------------|-----------|
| forbid hook (PreToolUse) | does this inject a second command? | hard-block `$()`, backtick, `<()`, `>` |
| gate 2 (PreToolUse check) | is every segment on the human's allowlist? | a hard-nudge — blocks the 1st try with the allowlist, allows a retry |
| the seam (PermissionRequest) | is every segment independently safe? | per-segment {clean-rhx OR allowlisted}, honors the deny set → approve / deny-a-smuggle / lift |
| the skill (execution) | is THIS operation allowed for THIS caller? | self-guard inside the skill |

each layer answers what it CAN see. the seam does not reach into the last
column — that is the skill's job, at run.

## .the producer/sink bars — same allowlist, two positions

the seam splits a compound quote-aware and judges each segment by its POSITION:

- **producer** (a segment on the left of a pipe, or a standalone chain segment) —
  bar is {clean-rhx OR allowlisted}. an allowlisted producer like `npm run build`
  or `git log` qualifies on its own; it is already trusted to run alone, so a pipe
  of its stdout onward grants it no new authority.
- **sink** (a segment on the right of a pipe) — bar is narrower: {clean-rhx OR a
  read-only READER} where READER is a small hardcoded set (`jq`, `tail`, `head`,
  `wc`, `cat`), keyed on the LEAD token, AND still present in the human's
  allowlist. an allowlisted-but-code-exec sink (`npm run`, `bash`) does NOT
  qualify as a sink — a sink runs with attacker-influenced stdin, so it earns a
  tighter bar than the same command earns as a producer. a clean-rhx sink DOES
  qualify (rhx self-guards at execution, per this article).

the producer/sink asymmetry is INTENTIONAL: `npm run build` approves as a producer
but not as a sink — same command, different position, different bar, by design.

## .what the seam still denies

the seam is narrow, not toothless. it still hard-denies:

- **a smuggled second command** — an un-vetted segment joined by an unquoted `;`,
  `&&`, or `||`. that is a pure shape question the residue answers soundly.
- **a background/detach** — a lone `&`, which severs the command from the gate.
- **a newline/CR-joined compound** — the classic multi-line injection vector; a
  newline-joined "compound" is never in the safe-compound scope, even if both
  halves are individually safe.

any command whose every segment is not provably safe — but that is not a proven
smuggle either — **lifts** to a human (the fail-safe default). a segment that
matches the human's `permissions.deny` set also lifts (or denies), never
auto-approves.

## .see also

- `permissionrequest.decide-permissions.sh` — the decider this rule shapes
- `research.permissionrequest-hook-auto-approve.md` — the spike that proved the seam
- `rule.require.narrow-keyrack-unlocks.[rule].md` — the same least-privilege spirit, at the credential layer
