# F15: the abort trap stays in the skill, not an `arm_bound_abort` in the ops file

- fork: the skill installs its own INT/TERM/HUP traps, or the ops file offers `arm_bound_abort` that installs them and owns the 130/143/129 codes
- taken: the skill. its abort does more than stop the bound: it forwards to a multi-mode child, stops the spinner, keeps the partial logs, and names their path on the skill's own stdout. none of that belongs to the bound mechanism, so an `arm_bound_abort` would either take a callback or hand the skill back its own trap
- the mechanism's share is one call, `stop_bounded_run`, and the ops header shows the trap a caller writes
- rework: clean. when a second caller adopts the ops (F12), its trap is the evidence for what a shared arm would hold
- confidence: 80%
- where: the trap block near the top of `git.repo.test.sh`
- verdict: disputed at execution review
