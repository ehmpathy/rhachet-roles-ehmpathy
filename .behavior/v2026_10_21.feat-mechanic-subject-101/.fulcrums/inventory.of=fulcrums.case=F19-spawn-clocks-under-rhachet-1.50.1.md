# F19 — the boot + cost spawn clocks under rhachet 1.50.1

## the fork

under rhachet 1.50.1 (the F8 swap), each `npx rhachet roles boot` / `roles cost` spawn takes
20-40s under parallel load; `--subject nonexistent`, which fails fast, took 22,249 ms. the full
suite (`git.repo.test --what all`, 2026-10-23T00:26Z) went red on 7 tests, each a spawn
`ETIMEDOUT`: `boot.yml` at its 30s clock (30,247 ms), `boot.budget` at its 40s paired clock
(40,136 ms). no assertion failed.

options:
- A. give each spawn 120s (the clock whole-role costs already had), and the two files a 300s jest
  clock so a test or hook that spawns two fits
- B. keep 30s / 40s and pin rhachet back to `#main` — undoes the F8 decision
- C. run the boot suites serially — every other integration suite slows too, and the startup cost
  stands

## taken, and why

A. the cause is rhachet's per-spawn startup, outside this repo; the clocks only bound a hang, and
120s still fails a real hang loud with a named `ETIMEDOUT`. one constant (`TIMEOUT_MS_COST`)
replaces the alone/paired split.

## rework

clean — two constants and two `jest.setTimeout` lines; restore the tighter clocks once rhachet's
startup drops (`.dream/2026_10_23.reseed-rhachet-cli-startup-cost.dream.md`).

## confidence, and why it is low

85%. a reviewer earlier held the `boot.yml` 30s clock as test intent; the evidence now is that
the pinned rhachet cannot meet it under load, not that the test asks less.

## where

`src/domain.roles/boot.budget.integration.test.ts`, `src/domain.roles/mechanic/boot.yml.integration.test.ts`.

## verdict

best-guessed: A; for the director.
