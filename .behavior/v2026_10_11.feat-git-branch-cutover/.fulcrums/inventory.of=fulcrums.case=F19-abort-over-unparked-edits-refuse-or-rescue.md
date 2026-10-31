# F19: abort over an edit no park holds — refuse, or save a rescue ref

- **the defect** (i011 r011 finding 2): `abort` runs `git reset --hard` with no check, where `begin`
  guards the same step with `is_worktree_held_by_park`. a halt can last days; an edit saved to any
  tracked file meanwhile is erased, and the report still says "restored from park"
- **the fork**:
  - (a) **refuse**: if the worktree holds what the park does not, exit 2 and name the files
  - (b) **rescue ref**: before the reset, when the live worktree differs from the park, snapshot it
    (write-tree into a commit) to `refs/worktree/cutover/rescue`, outside `del_park_refs`; the
    report names the ref and `git checkout <ref> -- <path>`; then the undo proceeds
- **lean**: (b). mid-halt the worktree differs by design (a half-settled conflict), so (a) refuses
  most aborts and strands the human — the harm of F20 again. abort's job is the way out; the
  rescue ref makes that way lossless
- **rework**: clean — (a) and (b) are each one guard before the reset in `abort.sh`; neither
  reshapes a caller
- **risk**: low for (a), but it strands the human; medium for (b): a new ref lifecycle (when it is
  dropped) and a new report line
- **confidence**: 70% — abort's contract changes either way ("refuses" vs "keeps a copy"); the
  commander's word
- **where**: `git.branch.cutover.abort.sh`; `git.branch.cutover.operations.sh`; `output.sh`
- **status**: open — held, no code until ruled
- **verdict**: —
