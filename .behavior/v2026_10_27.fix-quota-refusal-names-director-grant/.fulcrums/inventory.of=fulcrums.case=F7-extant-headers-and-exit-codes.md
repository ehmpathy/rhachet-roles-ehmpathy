# F7 — the extant error headers and exit codes on the refusals this pr touches

## .the fork
the review asks this pr to fix two extant defects on the refusal sites it rewires:
- rebase headers `└─ error: …` and release headers `✋ blocked: …` lack the qualified class
  (`✋ ConstraintError:`), per `rule.require.qualified-error-headers`
- rebase exits 1 on a constraint, where `rule.require.exit-code-semantics` asks for 2

- (A) fix them here, since the pr touches the lines beneath
- (B) leave them; each rides its own caught dream

## .taken, why
B. this pr swaps only the fix lines beneath each header; the header and the `exit` line are
unchanged from main. both defects predate it and are tracked:
- headers: `.dream/v2026_09_27.fix.qualified-error-headers-beyond-git-commit.md` (cited in
  `git.commit/output.sh`), which covers every skill beyond git.commit at once
- rebase exit: `.dream/2026_10_27.rebase-constraint-exit-code.dream.md`, caught by this route
either fix changes extant snapshots and assertions in suites the wish does not name (rebase
`[case1]`–`[case9]`, release p1–p8), and a caller that reads rebase's exit 1 would see 2. that is a
contract change in its own right, which the wish did not ask for.

## .rework
clean: header swap to `print_tree_constraint` / `✋ ConstraintError:` and `exit 2` at known lines,
plus snapshot refresh. no caller in this repo branches on rebase's exit 1.

## .risk
low. the defects ship today on main; this pr neither adds nor removes them.

## .confidence
80% that scope-out is right: the rules say fix on contact, but the contact here is the line below,
and each fix ripples into suites outside the wish.

## .verdict
open — for the council.
