# F20 — where tests shed the session's clone serial

## .the fork

a test that runs inside an enrolled clone inherits `RHACHET_CLONE_SERIAL`. with the push hook live, a test push would watch a pr and spawn a real daemon.

- (a) strip it in each runner that spreads `process.env` (dozens of sites across the git.commit suites)
- (b) delete it once, in `jest.integration.env.ts`; a test that needs a serial sets one

## .taken, why

(b). one root cause, one fix. no extant test reads the session's serial.

## .rework

clean: one line in the jest env file.

## .confidence

88%. the env file may be a declapract-managed template; a later upgrade could drop the line.

## .where

`jest.integration.env.ts`.
