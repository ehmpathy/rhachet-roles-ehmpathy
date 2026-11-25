# F10 — structural refactors of the org reader and refusal renders: here, or a followup

## .fork
peer review names refactors that reshape extant code beyond the defect:
- extract the keyrack org reader into `keyrack.org.operations.sh`, sourced by `git.commit` and `git.branch.uses`
- collapse the three refusal renders (set, push, branch.uses) into one `print_org_refusal_remedy`
- replace the `ORG_*` globals with one record
- one fault → (lift, note) table
- a pure per-member verdict function split from the fold in `check_org_blocker`

- (a) land the defect fix with cheap in-place repairs (one reset function, explicit fault arms, no `exit` in the render subshell); catch the refactors as a dream
- (b) do the refactors in this pr

## .taken
(a). each refactor touches every caller of the reader or of a render, across two skill dirs, and the extant snapshots pin the render shape. in a defect pr that moves the gate rule, a reshape of the surface multiplies review load and risk. the in-place repairs close the concrete hazards named (reset drift, a silent `*)` arm, `exit` in a subshell).

## .rework
clean. the refactors stand alone; no contract in this pr blocks them.

## .confidence 85%
the reader is now a larger share of `git.commit.operations.sh`; a reviewer could hold the extraction is due at the moment it grew.

## .dream
`dreams/v2026_11_24.refactor.keyrack-org-reader-and-refusal-render.md`

## .verdict
best-guessed
