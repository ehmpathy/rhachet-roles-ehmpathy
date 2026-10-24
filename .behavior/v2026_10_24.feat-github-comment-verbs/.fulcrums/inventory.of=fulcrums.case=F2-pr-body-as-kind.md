# F2 · pr body as `set --kind body`

- fork: (a) `github.comment.set --pr N --kind body` · (b) #996 ask 3's separate `git.pr.body.set`
- taken: (a). the wish: "`github.comment.set` upserts a comment ..., and edits a pr body". github renders the body as the first post of the conversation; one verb family, one plan/apply/read-back path
- rework: clean — a rename of the flag, or a thin `git.pr.body.set` that calls `set --kind body`
- confidence 70%, low because: "body" is not a comment in github's api; `--kind body` stretches the noun. #996 ask 3 also wants "the pr of the current branch" and a secret-shape guard, which this vision omits (`--pr` stays explicit)
- where: case=1
