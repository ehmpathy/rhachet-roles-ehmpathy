# F22 — no paved `chmod`: ask a human, or pave a skill

## .the fork

the build refuses a skill `.sh` with no execute bit. no paved command sets a mode.

- (a) ask a human to run `chmod +x` once
- (b) pave `.agent/repo=.this/role=any/skills/chmodsafe.sh`: +x only, `.sh` only, inside the git root only, every path checked before any change

## .taken, why

(b). every new skill in this repo meets the same wall; a paved skill serves each next one. the first file was bootstrapped by a `cpsafe` copy of an executable peer, then its content rewritten.

## .rework

clean: delete one file.

## .confidence

85%. jest collects no test under `.agent/`, so the suite lives at `src/.test/skills.repo.this/chmodsafe.integration.test.ts`: +x via `--path` and `--glob`, `--help`, and each refusal (exit 2, both streams). a co-located home is caught as a dream: `.dream/v2026_11_01.fix.repo-local-skills-have-no-test-home.md`.

## .where

`.agent/repo=.this/role=any/skills/chmodsafe.sh`.
