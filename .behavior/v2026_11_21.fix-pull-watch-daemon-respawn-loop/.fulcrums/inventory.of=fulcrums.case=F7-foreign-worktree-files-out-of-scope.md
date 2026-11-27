# F7 · files this work did not author, left in the worktree, are out of this change

- fork: (a) answer each reviewer concern on `.husky/*` and `.foreman/*` by an edit of those files · (b) leave them as they are, keep them out of this change's commit, and dispute the concerns as out of scope
- taken: (b). the git status at the start of the session already held them: `.husky/check.nvm.sh`, `.husky/check.timestamps.sh`, `.husky/pre-commit` (modified), `.husky/check.secrets.sh`, `.husky/check.timestamps.lock.sh`, `.foreman/verdict.1.vision.forks.md` (untracked), beside `package.json`, `pnpm-lock.yaml`, and the `.agent` settings. none was written by this route. `.foreman/verdict.1.vision.forks.md` is the foreman's own verdict on F1, a human's record. an edit of either set would rewrite another author's work in progress, and would smuggle an unrelated change into a fix of the pr-watch daemon (rule.prefer.scouts-honor: a large or out-of-scope change smuggled in = blocker)
- how the change stays clean: the commit stages only the files this route wrote (the pull-watch skill, its hook, their tests, and this route's `.behavior` dir); the foreign files stay unstaged
- rework: clean. a reviewer who reads only this change's files sees none of them
- confidence: 90%. why not higher: the review guard reads every diff since main, so these files reach the reviewers until the human commits or sets them aside; that is the human's call, not this route's
- where: `git status --short -- .husky .foreman`
- verdict: open
