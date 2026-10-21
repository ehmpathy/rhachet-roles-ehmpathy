# F6 — upgrade carries no grant over; the first refusal names the split

- **fork** — auto-migrate (legacy `"push": "allow"` → push meter allowed; legacy quota > 0 → release allowed) · or carry naught and refuse loudly
- **taken** — carry naught. both meters fail closed (wish). an auto-carry of release would hand every tree with a commit quota a release grant no human stamped under the new contract. the loss is not silent: the refusal detects the legacy field and names the split plus the one regrant command (`case=8`). a release note in the pr body records it too
- **rework** — clean. a one-shot migrate can be added without a contract change
- **confidence** — 80%. a fleet of trees mid-flight each lose push at once; the human pays N local regrants, plus one `--org <org> allow` per org per new meter per machine (under F3, push and release no longer ride the commit org entry)
- **where** — `case=8`
- **verdict** — open
