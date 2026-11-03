# F2 — title input: inline `--title`

- fork: A. `--title '<text>'` · B. `--from <path|@stdin>` · C. both
- taken: A. a title is one line; a file or pipe for it is ceremony
- rework: clean. B adds one flag and one read
- confidence: 90%
- where: `git.pull.title.set.sh`
- verdict: overturned to B (commander, #1173 review, vision line 97: "lets make it symmetric. --from").
  `title set --from <path|@stdin>`; `--title` ships no more, not even as an alias. `title get --into`
  pairs with it, so a title rides the same file round trip as a body
