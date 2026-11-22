# F1 · usecase-rhachet-roles-package

## .the fork
- keep `useCase: npm-package`: the apply strips the `rhachet-roles-ehmpathy` self-dep, drops `npm run build` from `prepare:rhachet`, and `rhachet init --roles mechanic` fails (role not found)
- switch to `useCase: rhachet-roles-package` + self-dep `"rhachet-roles-ehmpathy": "link:."`: the use case declapract-typescript-ehmpathy@0.50.0 ships for repos that publish rhachet roles and self-link them

## .taken, why
switch. this repo publishes rhachet roles (briefs, skills, boot.yml, keyrack.yml) to npm and loads its own roles at boot. `useCases.yml` names `rhachet-roles-package` for that shape; `npm-package` lacks the role-repo delta. the practice's own self-dep notice names `link:.` as the sanctioned self-reference.

## .rework
clean: one line in `declapract.use.yml`, one devDep in `package.json`. revert both to restore the prior use case.

## .confidence
85%. why low: the old self-dep pinned a published version (1.40.0), not `link:.`; a human may have wanted boot to load the last release, not the local build.

## .where
`declapract.use.yml:3` · `package.json` devDependencies

## .verdict
settled by driver. reason holds: `useCases.yml` defines `rhachet-roles-package` for exactly this shape; the re-apply under it restored `npm run build &&` in `prepare:rhachet` unprompted, and boot, build, and every suite run green on `link:.`
