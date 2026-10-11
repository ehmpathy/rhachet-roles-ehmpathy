# blocker — 5.1.execution.from_vision

## .what blocks

the hook, the inventory, and the tests are written; types and lint pass. the integration tests
cannot run: `rhx git.repo.test --what integration` first unlocks `ehmpathy.test.FIREWORKS_API_KEY`
via keyrack, and that unlock fails:

```
CredentialsProviderError — Token is expired. To refresh this SSO session run 'aws sso login'
```

without a green integration run, the stone cannot pass: no snapshot review, no proof the clamps
bite, and no safe `npm run build` (a build would make an untested hook live in this session).

## .what I tried

| lever | result |
|---|---|
| `rhx git.repo.test --what integration --scope pretooluse.check-permissions --mode apply` | keyrack unlock errored — expired SSO token |
| `rhx keyrack unlock --owner ehmpath --env test` | same error; the fix is `aws sso login`, a human credential |
| run jest directly | `npx jest <file>` is not paved; a bust-through would only reach the absent human |
| `rhx git.repo.test --what types` / `--what lint` / `npm run fix:format` | ✅ all pass / applied |

second opinion: skipped under the carve-out — the wall is a credential, foreman-only.

## .what I need

```sh
aws sso login
```

then I run, in order:

1. `rhx git.repo.test --what integration --scope pretooluse.check-permissions --mode apply --resnap`
2. review the case30 / 31 / 32 snapshots
3. revert the rank and the inventory lookup in turn, confirm the clamps go red, restore
4. `npm run build`, then eyeball one live block and one live `ask` prompt (R3 in practice)

progress: `5.1.execution.from_vision.yield.md`.
