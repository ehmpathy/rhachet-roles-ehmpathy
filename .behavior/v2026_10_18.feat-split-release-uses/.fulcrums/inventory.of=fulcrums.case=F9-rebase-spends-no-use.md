# F9 — rebase needs a live commit grant but spends no use

- **fork** — rebase spends one commit use · spends none · needs no grant at all on a 0-ahead fast-forward
- **taken** — needs a live grant (left > 0 or unlimited), spends none. the amendment says rebase "needs commit". today it spends none despite its header (`git.branch.rebase.begin.sh:15` claims a decrement; no code does it) — fix the header, keep the behavior. a fast-forward still asks for the grant: one rule, no special case
- **rework** — clean
- **confidence** — 70%. the 0-ahead case writes no commit, so "no grant at all" is defensible
- **where** — `case=3` · `case=4`
- **verdict** — open
