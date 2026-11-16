# F9 · dispute: "case=5 renders only a narrative, no .bdd sketch"

- fork: concede and add a bdd sketch · dispute as a misread
- taken: dispute. the file on disk already holds `## .bdd sketch` with a closed `ts` fence and three `when` blocks (t0, t1, t2) that cite L10, L10/F4/F2, and L11. the same round's experience-coverage lane misread case=6 the same way (it saw a ts fence followed by dimensions-file text) — a sign the push-mode diff the lanes read interleaved new files
- evidence: `tail -20 1.vision.experience.case=5.second-version-gets-its-own-daemon.md` (2026-10-31, after round 2) prints the full sketch, which ends:
  ```
    when('[t2] a second v1.40.0 clone pushes', () => {
      then('it joins the v1.40.0 daemon; still two daemons on the box', ...); // L11
    });
  });
  ```
- rework: clean — if the council rules otherwise, there is no edit to make; the sketch exists
- risk: low — a review disposition; no credential, no prod write
- confidence: 97%
- where: dimensional-decomposition r2 nitpick.1
- verdict: (open; council)
