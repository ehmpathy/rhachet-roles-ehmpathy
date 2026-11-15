# F21 — the apply header stays as main has it; the outcome-named header is a caught dream

## .the fork

- **A (taken)**: leave `🐢 cowabunga!` as the apply-mode header, printed before the outcome is
  known, as main does. catch the fix as
  `.dream/v2026_11_15.followup.git-release-apply-header-names-the-outcome.md`
- **B**: in this pr, swap it for a neutral intent header (or buffer it until the first terminal
  state), so a refusal mid-apply never sits under a celebration

## .taken, why

- the shape predates this pr: main prints it, and the p1 rebase-refusal snapshot already shows it
  above a `needs rebase` exit
- the wish covers the review gate, not the apply header's vibe
- B resnaps every apply snapshot in p1, p3, and p9, a ripple that fails CLEAN for this diff
- every refusal this pr adds still opens its own tree with `✋ ConstraintError` or
  `💥 MalfunctionError`, so the fault is named where it happens

## .rework

dirty: the header is printed in `git.release.sh` for every apply run. a change touches every apply
snapshot across suites the gate does not own

## .confidence

80%: two l3 reviewers rated it the top nitpick. the commander may want it in this pr despite the
resnap

## .where

`src/domain.roles/mechanic/skills/git.release/git.release.sh` (apply-mode `print_turtle_header`)

## .verdict

awaits the commander
