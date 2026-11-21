# F1: declare `"private": false` over the backfilled `true`

## .fork
practice `provision-github/bad-practices/implicit-package-privacy` backfills `"private": true` where `private` is absent. options: keep `true`, or declare `false`.

## .taken
`false`. repo is PUBLIC on github (`gh repo view` → `PUBLIC`) and publishes to npm (`npm view rhachet-roles-ehmpathy version` → `1.43.0`). `true` blocks `npm publish` and drives provision-github to set the repo private.

## .rework
clean — one key in package.json.

## .confidence
97%. both facts verified by command.

## .where
package.json:5

## .verdict
unruled
