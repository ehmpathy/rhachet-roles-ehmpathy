# howto: use keyrack for credentials

## .what

mechanics use `rhx keyrack` to unlock credentials for integrations.

## .the pattern

always unlock the `ehmpath` owner — mechanics are ehmpaths:

```sh
rhx keyrack unlock --owner ehmpath --env test
rhx keyrack unlock --owner ehmpath --env prep
rhx keyrack unlock --owner ehmpath --env prod
```

**always use `--owner ehmpath`** — without it, you'll hit the human's personal keyrack, which is protected by a yubikey and will block.

**note:** owner is `ehmpath`, not `ehmpathy`. ehmpath is a subdomain of ehmpathy, focused on ehmpathetic clones enrolled via rhachet.

credentials expire after ~9 hours. re-unlock if expired.

## .status

to see which keys are unlocked:

```sh
rhx keyrack status --owner ehmpath
```

## .errors

| error | fix |
|-------|-----|
| `credential is locked` | run unlock command |
| `credential not found` | check key name, check env |
| `credential not filled` | ask human to run `rhx keyrack fill --owner ehmpath` |
| `host manifest not found` | ask human to run `rhx keyrack init --owner ehmpath` (one-time setup) |

