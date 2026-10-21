# F10 — each meter owns its own global kill switch

- **fork** — `git.commit.uses block --global` halts all three acts (a machine-wide stop) · or it halts only commits
- **taken** — only commits. "each is granted, blocked, or revoked without touch of the other two." today a global commit block also halts release (`git.release.sh:266-277`); after, a human halts releases with `git.release.uses block --global`
- **rework** — clean
- **confidence** — 80%. a human who learned "one global block stops the crew" loses that reflex; a `--all` stop may be owed later
- **where** — `case=6`
- **verdict** — open
