use snapshots whenever output artifacts are created

why?
- makes it easier to review in prs what is actually being produced
  - e.g., visual spotcheck, make sure it looks good
  - especially important when the output is userfacing (e.g., codegen, comms, etc)

- makes it easier to detect exactly what the impact of a change is
  - most of the time its intended and the snapshot can just be updated
  - sometimes though, the snapshot diff exposes critical differences that are blockers or nitpicks that need to be addressed


---

critical:

use both
- a snapshot
- AND
- explicit assertions before the snapshot

snapshot is for observability in code reviews and aesthetic verification
assertions are for functional verification
