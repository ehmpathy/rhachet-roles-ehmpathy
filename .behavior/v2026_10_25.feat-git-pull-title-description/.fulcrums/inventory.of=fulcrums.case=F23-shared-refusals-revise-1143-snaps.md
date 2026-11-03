# F23 — the shared refusals this pull touches revise #1143's locked comment expectations

- fork: A. keep each revision, recorded, for the pr reviewer to sign off · B. revert each to the text
  #1143 locked (a noun parameter keeps `post under` for comment writes; drop case9's `drop --pr`
  row; restore case20's one-row fix; keep the placeholder "edit in the github ui" fix)
- taken: A. every revision lives in `git.pull.comment.operations.sh`, the one file all `git.pull.*`
  verbs share, so the comment family moves with the new verbs by construction:
  - `# post under your own gh login` → `# act under …`: the refusal serves get, set, and del of four
    verbs; "post" was false for a comment get or del before this pull
  - case9 gains `drop --pr to address the pull of this branch` (5 snap sites): one shared
    `get_one_gh_pull` now reads every pull; a wrong `--pr` on the caller's own branch has a one-flag fix
  - case20's fix becomes a pick list led by `rhx git.commit.push --mode apply`: a fresh branch has no
    pull to name until a push opens one
  - case14 [t2] / [t4]: the pr-description fix names `git.pull.description set` (F19); the old text
    was the "tracked in #1165" placeholder for this very verb
  - `--from ./reply.md` hints → `./.temp/reply.md`, the gitignored scratch the `--to` fence permits
  - the real-api comment snap's one fix string, aligned by hand (F7: live runs are opt-in)
- why it holds: none loosens an assertion; each fix is more exact than the one it replaced; a revert
  splits one refusal into per-family copies, the drift the shared file exists to prevent
- rework: clean. each is one string in one shared file plus its snaps
- confidence: 80%. the reviewer (5.3 r12) graded these `better` and asked for a human sign-off, not a
  revert; the sign-off is the council's
- where: `git.pull.comment/git.pull.comment.operations.sh`; rationale in
  `review/self/for.5.3.verification._.has-snap-changes-rationalized.md` ("the four shared changes")
- verdict: open, for the pr review
