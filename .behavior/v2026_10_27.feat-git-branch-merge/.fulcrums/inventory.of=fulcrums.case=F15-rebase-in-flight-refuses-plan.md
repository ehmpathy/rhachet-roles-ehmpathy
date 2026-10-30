# F15 — a rebase in flight: plan flags it, or begin refuses in both modes

## .the fork
vision cell #13 has plan flag a rebase in flight, and apply refuse it. a rebase in flight detaches
HEAD, so `get_current_branch` reads `HEAD` and the branch guard fires first with "will not merge
into HEAD" — a wrong cause. (a) keep cell #13: special-case the branch guard while a rebase is in
flight; (b) refuse a rebase in flight in both modes, before the branch guard, and name its exits.

## .taken
(b). begin checks for a rebase in flight right after the repo check, in plan and apply alike. the
refusal names `rhx git.branch.rebase continue` and `abort` as the exits. a plan over a detached
HEAD has no branch to preview, so a flag would print a preview of naught.

## .rework
clean: one guard moves below the branch check, and plan prints a flag line in place of the
refusal. no caller, contract, or later work leans on it.

## .risk
low. a mechanic who runs plan mid-rebase gets a refusal where it hoped for a preview; the refusal
names the two exits, and no state changes in either mode. clamped by begin case6 (t0 plan, t1
apply).

## .confidence
90%. the deviation from cell #13 is forced by git's own state, not a taste call.

## .where
`git.branch.catchup.begin.sh` (rebase guard), `1.vision.experience.case=_.md` row #13.

## .verdict
taken by the driver: an execution fork (seed S6).
