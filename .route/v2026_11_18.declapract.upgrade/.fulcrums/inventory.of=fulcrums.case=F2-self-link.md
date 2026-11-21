# F2: self-dep `rhachet-roles-ehmpathy` as `link:.`

## .fork
upgrade dropped the self-dep `rhachet-roles-ehmpathy: 1.40.0` (warn: "a package should not depend on itself; if intentional, use link:. or file:."). without it, `rhachet init` fails: `role "mechanic" not found`. options: restore the npm pin, or `link:.`.

## .taken
`link:.`. the warn names it; peer repo `rhachet-roles-bhrain` declares `"rhachet-roles-bhrain": "link:."`; the rhachet practice adds `npm run build &&` before `rhachet init` on a `link:.` self-dep, and applied it on re-run. a pin to the npm release booted a stale copy of the roles.

## .rework
clean — one devDependency line.

## .confidence
95%. precedent + practice support verified.

## .where
package.json devDependencies

## .verdict
unruled
