# F47 — the driver role heals the mechanic's `.route/` deny; the propagate test exempts it

## .the fork

- **drop the deny from the mechanic role:** remove `Edit(*/**/.route/**)` from
  `init.claude.permissions.jsonc`, since the driver owns `.route/`
- **keep the deny; the test exempts what the driver heals:** the propagate test reads the
  installed driver's own strip list and skips exactly those entries
- **pin bhrain back to 0.38.0:** the release before the heal

raised at release: ci ran `rhachet init` for every role; bhrain 0.39.3's
`init.claude.permissions.route.sh` stripped the deny, and
`getMechanicRole.permissions-propagate` (new on this route) read the gap as a silent loss.

## .taken — keep the deny, exempt the heal, and why at the time

- the deny ships to every consumer of the mechanic role, many with no driver enrolled. to drop
  it would loosen their guard for one co-enrolled role's sake
- the driver declares its heal on purpose: route protection lives in its
  `route.mutate.guard` hook. an override a role declares is owned, not silent
- the exemption reads the driver's own file, so it tracks upstream exactly; an uninstalled
  driver exempts naught, and a then asserts the list was read

## .why the confidence is low

- whether the mechanic should keep a deny the driver always heals is a cross-role policy call

## .rework

**clean** — drop the exemption, or drop the deny from the mechanic source.

## .confidence — 75%

## .where

- `src/domain.roles/mechanic/getMechanicRole.permissions-propagate.integration.test.ts`
- `node_modules/rhachet-roles-bhrain/dist/domain.roles/driver/inits/init.claude.permissions.route.jsonc`
