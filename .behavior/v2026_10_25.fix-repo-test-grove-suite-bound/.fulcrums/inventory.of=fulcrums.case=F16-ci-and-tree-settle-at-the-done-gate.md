# F16 — ci evidence and the uncommitted tree settle at the done gate

- **fork:** commit and push now, so ci runs on the current tree mid-route · hold commits until
  the done gate, as the director ruled, and settle each path there
- **taken:** the done gate. the director (rhachet-ktlo, 2026-10-26): "once 5.1 passes: rebase onto
  main, settle each of the 22 paths (in the pr at the done gate, or kept out with its reason
  named), and git.release --watch green. commits wait for the done gate."
  (`rule.forbid.commits-the-route-did-not-ask-for`)
- **the planned dispositions:**
  - in the pr: `src/**`, the route artifacts, `package.json` + `pnpm-lock.yaml` (devDep bumps,
    lock regenerated after the rebase), the set.package pin (F11)
  - kept out: `.agent/.actors/…/settings.of.grove.json` (a machine-local symlink),
    `settings.of.repo.json` (init churn, rewrites a home path)
  - restored: the three deleted root `review/self/*.md` (unrelated to this change)
- **evidence until then:** local runs on this tree — the seven skill suites 655 passed, the grove
  suite 98 passed; `types` and `lint` passed
- **rework:** clean
- **confidence:** 95% — the director's words
- **raised by:** peer i004 — enroll-impl-behavior-intent blocker.4; enroll-impl-arch-defects scope
  leaks (uncommitted churn, set.package)
- **verdict:** settled by the director's ask, 2026-10-26
