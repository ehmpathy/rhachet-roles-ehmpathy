# F28 — grove tests this branch added were revised by peer repairs, each with a clamp

- **raised by:** `enroll-verif-test-intent` blocker.3, blocker.4, blocker.5, 5.3 peer i004
- **fork:** restore each first-draft criterion · keep the revised criterion, which a 5.1 peer
  repair set and a red-then-green clamp proves
- **taken:** keep. none of the three tests exists on `origin/main`; each first draft asserted a
  defect that a 5.1 peer review then found:
  - **blocker.3, `[case6] [t3]` / `[t4]`:** the first draft held that a `0444` slot file fails
    loud. under `fs.protected_regular=2` (the ubuntu 24.04 default) that file is exactly the
    shape another user's slot takes in the shared 1777 pool, so a fail there broke the
    multi-user pool F7 chose. the open is now read-only (flock needs no write). `[t4]` was red with
    the old `9>>` open, green now (5.1 yield, row 80; 5.1 i004 r10 `.taken`). `[t3]` keeps the
    fail-loud case for a file the user truly cannot open (`0o000`)
  - **blocker.4, `/⏳ still held \(3[01]s\)/` — retired in 5.3 i005, fixed at the cause:** the
    beat now names its own mark (`30s`, `1m00s`), which the wait has reached, not a measured age
    that drifts with the poll. the test pins `⏳ still held (30s)` exactly, as its first draft did
  - **blocker.5, nest marker `slot.0` → `slot.0:<pid>`:** a bare env marker let a leaked or
    inherited `GIT_REPO_TEST_GROVE_HELD` bypass the bound forever (5.1 i004 r11, hazard 1). the
    marker now carries the holder pid and binds only while that pid lives; `[case4]` was red with
    the old gate (a gone-pid or pid-less marker bypassed), green now (5.1 yield, row 79). the
    live-nested bypass the vision drew still holds and is asserted and snapped
  - **`[case3] [t5]`, SIGKILL as a thorough scoped run lists its scope (5.3 i005, i006):** its
    first draft killed a holder after its claim, mid-list. the skill now lists before it claims
    (so a run that fails fast never waits), and the case proves that order: no claim before the
    list, and a kill there leaves no slot held. retitled in i005 to state it. a killed holder that
    frees its slot stays clamped by `[case3] [t0]`
- **rework:** clean — each is a test revert, though each revert re-asserts a defect
- **confidence:** 90%
- **verdict:** accepted (director, 2026-10-28) — the review-driven test revisions stay
