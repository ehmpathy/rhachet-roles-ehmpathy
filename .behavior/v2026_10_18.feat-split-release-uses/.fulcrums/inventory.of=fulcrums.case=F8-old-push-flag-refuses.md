# F8 — the old `git.commit.uses set --push` flag refuses, no shim

- **fork** — shim: `--push allow` also writes the push meter · or refuse with both replacement commands
- **taken** — refuse. a shim re-creates "one command grants two meters" (forbidden cell X7), and keeps the old mental model alive. the refusal teaches the new one in a single read
- **rework** — clean
- **confidence** — 75%. every human habit, brief, and charter that types `--push` breaks at once; the error names the fix, but it is friction
- **where** — `case=8` [t3]
- **verdict** — open
