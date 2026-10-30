# F16 — the mechanic src boot drops what never ships

## .the fork
the catchup tests took the src boot to 30,246 / 30,000 tokens (`npx rhachet roles cost --what
src/domain.roles/mechanic/boot.yml`). the src boot sweeps every unlisted file under `skills/` into
`<also>`: subcommand bodies, `.test/` fixtures, `*.test.ts`, `__snapshots__`. the build
(`build:complete:dist`) never ships test code, so a consumer boot never holds it; the linked spec
passed at once. the director forbids a budget raise. (a) `not` only the catchup files; (b) `not`
the catchup subcommand bodies, plus test code across `skills/`; (c) demote a `say` entry.

## .taken
(b). a `not` stanza under `always.skills`:
- `skills/git.branch.catchup/git.branch.catchup.*.sh` — bodies the dispatcher execs; its `--help`
  names each
- `skills/**/.test/**`, `skills/**/*.test.ts`, `skills/**/__snapshots__/**` — test code the build
  never ships

the src boot now reads 28,171 tokens. `<also>` still lists every shipped `.sh` (verified via
`npx rhachet roles boot --manifest src/domain.roles/mechanic/boot.yml`).

## .rework
clean: one stanza in `boot.yml`. a revert to (a) drops three lines.

## .risk
low. the change touches the measure, not what ships: dist holds no test code, so a consumer's boot
is byte-identical. the drift risk is the reverse: a future file kind the build ships under one of
these globs would vanish from boot. today no shipped file matches them. with (a) alone, each new
skill with tests would overflow the src boot while the shipped boot stays under, which is the
false alarm this cures.

## .confidence
85%. role-wide reach beyond this verb is the call a reviewer may want narrowed; (a) is the clean
fallback.

## .where
`src/domain.roles/mechanic/boot.yml` (`always.skills.not`).

## .verdict
taken by the driver: an execution fork (seed S6); within the director's "do not raise the budget".
