# F1 — target: current branch by default, `--pr` override

- fork: A. the open pull of the cwd branch, `--pr <n>` overrides · B. `--pr` required
- taken: A. the common call is a driver on its own branch. #1143 merged with A already
  (`set_comment_pr`), so the family reads one way
- rework: clean. B is one more check before `set_comment_pr`
- confidence: 90%. low only because the commander had not ruled
- where: `git.pull.title.{get,set}.sh`, `git.pull.description.{get,set}.sh` via `set_comment_pr`
- verdict: open, for the pr review
