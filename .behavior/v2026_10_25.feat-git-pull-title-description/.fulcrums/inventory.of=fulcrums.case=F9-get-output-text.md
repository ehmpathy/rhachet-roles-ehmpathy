# F9 — `get` adds `--output text`: the bare field, for a pipe

- fork: A. `--output tree|json` alone, as the comment family · B. add `text`, the bare field
- taken: B. the vision's round trip is get → edit → set; a tree wraps the body in branches, and
  json needs a jq to unwrap it. `text` lets `get --output text > body.md` feed `set --from` as is
- rework: clean. drop one enum value and one branch
- confidence: 75%. a third output shape the comment family lacks
- where: `git.pull.title.get.sh`, `git.pull.description.get.sh`
- verdict: open, for the pr review
