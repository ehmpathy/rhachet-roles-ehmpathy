# F3: repair of the package.json the rhachet practice apply wrote

- fork: keep the apply's output verbatim · or repair the parts that break install or prod
- taken: repair three parts. the parts that remain are the practice upgrade, which lands apart from the fix (director order)
  - three devDeps written as `@declapract{check.minVersion('x')}` → pinned to the stated min versions. pnpm cannot read the raw spec
  - `rhachet-artifact-git` moved by the apply to devDependencies → kept in dependencies. prod code imports it at runtime (`codegenBriefOptions.ts:5`, `getMechanicBrief.ts:2`, `getEcologistBrief.ts:2`, `compress.via.bhrain.ts:24`)
  - `npm run build &&` dropped from `prepare:rhachet` → restored. this repo's roles link from `dist/`
- also: `declapract` bumped 0.13.14 → 0.13.27. `declapract-typescript-ehmpathy@0.50.0` declares peer `declapract >=0.13.26`, and 0.13.14 crashes on its empty `checks`
- rework: clean. the edits live only in the practice-upgrade change
- confidence: 85%. the upstream practice may intend the dep move; that call belongs to the practice owner
- where: `package.json`
- verdict: open
