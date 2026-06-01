# howto.fix-declapract-upgrade-failures

## .what

common failures when `rhx declapract.upgrade exec` fails and how to fix them.

## .why

if `declapract.upgrade exec` fails, this is a BLOCKER. do NOT proceed to the next stone. fix the failure first.

## common failures

### absent variables

**symptom:**
```
error: variable 'organizationName' is required but absent
```

**fix:**
1. check `declapract.variables.yml` in the repo
2. check `declapract-configs` for required variables
3. add the absent variable with correct value
4. re-run `rhx declapract.upgrade exec`

### pnpm approve-builds

**symptom:**
```
 WARN  2 packages have build scripts that were not executed.
 WARN  Run "pnpm approve-builds" to pick which ones should be allowed to run.
```
or build fails because esbuild/other native packages have not built.

**fix:**
1. update `package.json` to pin pnpm to v10.24:
   ```json
   "packageManager": "pnpm@10.24.0"
   ```
2. run `pnpm install`
3. re-run `rhx declapract.upgrade exec`

**why this happens:**
pnpm 10.25+ blocks postinstall hooks by default and requires explicit approval via `pnpm approve-builds`. v10.24 excludes packages by default with optional opt-out, which avoids this approval flow.

## if none of the above

1. read the error message carefully
2. document the failure in the route artifact
3. mark stone as blocked: `rhx route.stone.set --stone 1.upgrade.invoke --as blocked`
4. escalate to human for triage

## .enforcement

- proceed past failed exec = blocker
- skip without fix attempt = blocker
