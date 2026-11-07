# F7 — pool per user home, or per machine

- **fork:** `$HOME/.rhachet/storage/...` (per user) · a machine-wide dir (per machine, needs a
  shared-writable mode)
- **taken at the guess:** per user home, from the wish's words ("its state lives in the user's
  home"). confidence 65%: the wish's goal ("spans every tree and repo on the machine") and its
  words agree only for one user, and this box holds three home dirs
- **rework:** clean — one path constant; the lock logic is path-agnostic
- **where:** yield `.the contract` (slot pool), `.open questions & assumptions`
- **verdict:** ✅ **settled by the director, 2026-10-25 14:05 CT** — one pool per machine, never
  per user. "the load is the box's, so the bound is too. a per-user pool lets three users run
  three times the bound." → the guess is overruled. the pool moves to
  `/run/lock/rhachet/git.repo.test/` (tmpfs, `drwxrwxrwt root` here): dir created `1777`, slot
  files `0666`, so every user can lock every slot. `GIT_REPO_TEST_SLOTS_DIR` overrides it for
  hermetic tests
