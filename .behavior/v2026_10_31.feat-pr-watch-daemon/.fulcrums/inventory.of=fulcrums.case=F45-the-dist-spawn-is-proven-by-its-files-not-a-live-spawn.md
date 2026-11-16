# F45 — the shipped spawn is proven by its files at acceptance; a live spawn from dist stays a dream

## .the fork

5.3 i005 peer lane r10 blocker.1: no test runs `set --mode apply` from the shipped dist, so a
build fault would show only at spawn. the daemon boots from a copy of the skill dir's `*.sh`.

- (a) an acceptance case that spawns a daemon from dist: a temp HOME, a clone in the real
  rhachet registry, a keyrack with no token, so the daemon boots and pauses `absent`
- (b) an acceptance case that proves the linked role ships every `*.sh` the daemon boots from;
  the live spawn from dist stays in the push → alert journey dream

## .taken, why

(b). a clone in the real registry needs a real enrollment of a temp repo, which no acceptance
suite here performs, and a seed of the registry's own files would pin a foreign package's
internals. the defect class the reviewer names, a file the build drops, is caught by (b) at its
cause: blackbox [t7] compares the linked role's `git.pull.watch/*.sh` to source and requires
the daemon, alert, and operations files. the spawn, boot, pause, and exit run for real in the
lifecycle and delivery suites. the reviewer marks the full-journey deferral as the commander's
call; it stays held for him.

## .rework

clean: (a) adds one acceptance case once an enrollment fixture exists; naught built on (b).

## .confidence

80%: (b) catches a dropped file, not a dist-only runtime fault (e.g. a path that resolves only
under `src/`); none is known, and the daemon resolves its own dir via `BASH_SOURCE`.

## .where

`blackbox/git.pull.watch.acceptance.test.ts` [t7];
`.dream/v2026_11_01.feat.pr-watch-push-to-alert-journey.md`.
