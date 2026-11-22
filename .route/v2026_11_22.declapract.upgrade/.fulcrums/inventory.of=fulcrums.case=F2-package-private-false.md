# F2 · package-private-false

## .the fork
- keep the backfilled `"private": true` (provision-github `implicit-package-privacy`): `npm publish` refuses, and the next provision flips the github repo to private
- declare `"private": false`: the repo stays public and publishable, as it was before

## .taken, why
`"private": false`. before this change an absent key provisioned public (`provision/github.repo/resources.ts` at HEAD: `private === true ? 'private' : 'public'`), and the package publishes to npm. the practice readme: a package published to npm declares `"private": false`, set by hand.

## .rework
clean: one value in `package.json`.

## .confidence
95%. preserves prior visibility and publish behavior; the one doubt is whether the owner meant to take the repo private.

## .where
`package.json:5`

## .verdict
settled by driver. reason holds: `false` preserves HEAD's provisioned visibility (public) and npm publish; `true` would ship two behavior changes no one asked for
