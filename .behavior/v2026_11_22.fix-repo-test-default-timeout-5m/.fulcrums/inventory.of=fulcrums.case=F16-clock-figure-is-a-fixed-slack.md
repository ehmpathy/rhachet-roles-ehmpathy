# F16: the caller's-clock figure is bound + a fixed slack, not bound + seconds already spent

- fork: print `bound + GIT_REPO_TEST_BOUND_CLOCK_SLACK`, or add the seconds the skill has already spent (`$SECONDS`) before the line prints
- taken: the fixed slack. the line is advice a caller reads to size its next call, and a figure that moves with the host's speed (keyrack unlock, a slow `--listTests`) would differ call to call for the same suite. the 30s slack is sized to hold that pre-run work plus the 10s grace; a pre-run phase that takes more than ~20s is itself a defect to fix, not a figure to fold in
- the figure is also snapshot-stable as a constant; `$SECONDS` would vary by a second run to run and need a mask in every frame
- rework: clean. one term in `get_bound_shell_clock`, plus a sanitizer mask
- confidence: 80%. a caller on a host where keyrack takes long could still undercut; the howto says to allow "more than" the figure
- where: `get_bound_shell_clock` in `git.repo.test.operations.sh`; `print_bound_notice` in `git.repo.test.sh`
- verdict: disputed at execution review
