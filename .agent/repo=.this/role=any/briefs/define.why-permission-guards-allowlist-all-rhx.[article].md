# define.why-permission-guards-allowlist-all-rhx

## .what

the permission seam (the `PermissionRequest` decider,
`permissionrequest.decide-permissions.sh`) auto-approves **any clean single
rhx / npx-rhachet call**. it does NOT denylist specific rhx subcommands — no
carve-out for `git.commit.uses set`, `keyrack unlock`, `set.package.install`,
or any other "dangerous" skill. the whole rhx namespace is allowlisted **by
shape**: lead with rhx, no shell-active metachar in the residue, and the seam
approves.

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
| the seam (PermissionRequest) | clean single rhx, or a chain? | approve / deny-a-chain / lift |
| the skill (execution) | is THIS operation allowed for THIS caller? | self-guard inside the skill |

each layer answers what it CAN see. the seam does not reach into the third
column — that is the skill's job, at run.

## .what the seam still denies

the seam is narrow, not toothless. it denies a command that **smuggles a second
command** — an unquoted chain or background (`;`, `&`, `&&`, `||`, newline). that
is a pure shape question the residue answers soundly. any command that is neither
a clean single rhx call nor a chain **lifts** to a human (the fail-safe default).

## .see also

- `permissionrequest.decide-permissions.sh` — the decider this rule shapes
- `research.permissionrequest-hook-auto-approve.md` — the spike that proved the seam
- `rule.require.narrow-keyrack-unlocks.[rule].md` — the same least-privilege spirit, at the credential layer
