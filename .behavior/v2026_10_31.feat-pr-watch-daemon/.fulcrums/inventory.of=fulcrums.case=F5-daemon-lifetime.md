# F5 · daemon lifetime = exit at zero watches

- fork: tie to the spawner (`PR_SET_PDEATHSIG` / parent poll) · idle timeout · exit at zero watches
- taken: exit at zero watches — a shared daemon outlives any one spawner by design (the wish), so a spawner tie would kill it under the other clones. zero watches is the shared daemon's true "no client" signal; dead clones drop their watches at delivery
- rework: dirty — case=10, case=9, and the watch record shape all lean on it; a reversal reshapes the lifecycle
- risk: low — a process lifetime; it touches no credential and writes no prod state
- confidence: 90% — the residual risk is a watch on a dead clone that never gets an event, so never gets a delivery that would detect the death. mitigation for the blueprint: probe each watch's clone liveness each tick, not only at delivery
- where: `1.vision.experience.case=10.watch-ends-and-daemon-exits.md`, F3 invariant in `case=_`
- verdict: (open; rides vision approval)
