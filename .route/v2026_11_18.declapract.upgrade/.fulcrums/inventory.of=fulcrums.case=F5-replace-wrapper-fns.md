# F5: replace `wrapper-fns` with local `withRetry` + `withTimeout`

## .fork
new `test:lint:cycles` stays red on two prod-shipped cycles, both via prod dep `wrapper-fns@1.1.7` (its latest): `bottleneck@2.19.5` (Bottleneck.js ↔ Group.js, required by its `withBottleneck`) and `helpful-errors@1.5.3` (via `iso-time@1.10.1`, required by its `withTimeout`). `.dpdmrc.yaml` policy: a prod-dep cycle is never excluded — "dispatch the fix upstream or replace the dependency". options:
1. replace: local `withRetry` + `withTimeout` in this repo; drop `wrapper-fns` from dependencies; dispatch the upstream fix too
2. upstream only: dispatch to `ehmpathy/wrapper-fns`, wait for a release; PR red until then
3. exception: exclude the two prod cycles, against policy

## .taken
1, plus the upstream dispatch. the policy names replacement as a sanctioned remedy; the two wrappers are ~40 lines with one call shape (`withRetry(withTimeout(async () => …, { threshold }))()`, 7 call sites in 4 files, no context passed); a consumer stops receipt of both cycles at once.

## .rework
clean — swap the import path back to `wrapper-fns` at 4 files and delete the two local files once upstream ships a cycle-free release.

## .confidence
75%. why low: the wisher was offered these same three options and has not yet ruled; this adds code beyond the upgrade itself.

## .where
`src/domain.operations/wrappers/withRetry.ts`, `src/domain.operations/wrappers/withTimeout.ts`; call sites in `guardBorder/imagineIsContentAdmissible.ts`, `kernelize/extractKernels.ts`, `kernelize/clusterKernels.ts`, `librarian/skills/brief.compress/compress.via.bhrain.ts`

## .premise failed on verification
after the swap (`wrapper-fns` removed, `iso-time@1.11.7` added), `test:lint:cycles` still reports both cycles:
- `bottleneck@2.19.5` is also a runtime require of prod dep `@ehmpathy/as-command@1.0.5` (`asCommand.js`; latest release, pins `bottleneck: 2.19.5`; imported by `src/contract/commands/codegenBriefOptions.ts`), and of this repo's own non-test eval files that compile to `dist/` (`cluster.perfeval.ts`, `kernelize.perfeval.ts`, `brief.condense/runPerfevals*.evals.ts`, `brief.compress/runPerfevals.evals.ts`)
- `helpful-errors@1.5.3`: a second chain, not yet traced (the cache packages all link `helpful-errors@1.7.3`)

so a replacement of `wrapper-fns` alone cannot green the check. `bottleneck`'s cycle is internal to a third-party package that the org's own libraries pin. confidence → 30%; escalated to the wisher as a scope decision.

## .verdict
reverted (2026-11-18): no commander call owed, since `rule.forbid.dpdm-exclude-change` settles it. the replacement alone could not green the check, since other prod pinners hold both cycles. call sites restored to `wrapper-fns@1.1.7`, local wrappers deleted, `iso-time` removed. the cycles were then fixed in the deps: `helpful-errors@1.5.3` overridden to `1.7.5`, `bottleneck@2.19.5` patched (yield D1).
