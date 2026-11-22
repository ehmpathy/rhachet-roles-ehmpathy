# F1: halt exits 2 (constraint), not 1

- fork: keep the extant exit 1 (`malfunction`) on a halt, or move to exit 2 (`constraint`)
- taken: exit 2. the wish names the speed defect as the driver's own to root cause; `rule.require.exit-code-semantics` maps "caller must fix" to 2. exit 1 invites a retry that reruns just as slow
- rework: clean. one literal in the halt branch, one snapshot, one assertion
- confidence: 85%. a caller somewhere may branch on exit 1 for a timeout; none found in this repo
- where: `git.repo.test.sh:1717`
- verdict: open
