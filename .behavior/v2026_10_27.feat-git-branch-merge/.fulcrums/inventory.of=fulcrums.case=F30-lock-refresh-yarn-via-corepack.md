# F30 — lock refresh's yarn branch: run it for real through corepack, or defer it

- **fork**: peer lanes `mech-external-contracts` and `ergo-contract-snapshots` ask for each package manager lock refresh shells out to, run for real. pnpm and npm run on every node host. yarn often rides only as corepack's shim, which prompts before its first download and refuses any pm under this repo's `packageManager: pnpm` pin. (a) defer yarn to a dream; (b) pin yarn as a repo dev dependency; (c) run the host's yarn with no corepack prompt, a shared corepack cache, and the version probe outside the repo
- **taken**: (c). it runs the real yarn with no change to the repo's deps; `LOCK_ENV_OF_PM` in `genLockScene.ts` carries the env, and the probe runs from `os.tmpdir()`. a host with a global yarn 1 runs it the same way
- **rework**: clean. a switch to (b) replaces one env map; no caller depends on the choice
- **risk**: low. on a host with no network and no cached yarn, corepack fails its first download, and the scene fails fast with the probe's stderr as context, never a silent skip
- **confidence**: 85%
- **where**: `git.branch.catchup.lock.integration.test.ts` `[case6-npm]`, `[case6-yarn]`: 8 passed
- **verdict**: taken by the driver: an execution fork (seed S7)
