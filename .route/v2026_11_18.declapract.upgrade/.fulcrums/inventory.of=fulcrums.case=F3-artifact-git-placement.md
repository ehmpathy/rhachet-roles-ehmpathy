# F3: keep `rhachet-artifact-git` in devDependencies

## .fork
practice `rhachet/bad-practices/prod-deps` (`/^rhachet(-[a-z]+-.*)?$/`) moved `rhachet-artifact-git` from dependencies to devDependencies. prod code imports it at runtime (`genArtifactGitFile`, `getGitRepoRoot` in `getMechanicBrief.ts`, `getEcologistBrief.ts`, `codegenBriefOptions.ts`, `compress.via.bhrain.ts`). options: keep the move, or restore it to dependencies.

## .taken
keep the move. `rhachet@1.51.0` depends on `rhachet-artifact-git@1.1.5` (the same pin), so every host that runs these roles carries it — the same host-supplied contract this repo already relies on for `rhachet` itself (a devDependency, imported at runtime by `getRoleRegistry.ts`). a restore would also be reverted by the practice on the next upgrade.

## .rework
clean — move one line back to dependencies (and dispute the practice upstream).

## .confidence
75%. why low: under a strict pnpm layout, a host's copy of `rhachet-artifact-git` may not be reachable from this package's dir; the same risk applies to `rhachet` today and is not observed to break.

## .where
package.json devDependencies

## .verdict
unruled
