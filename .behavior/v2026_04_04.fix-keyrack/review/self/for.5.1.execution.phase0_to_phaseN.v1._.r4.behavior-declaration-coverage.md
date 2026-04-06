# self-review: behavior-declaration-coverage

## criteria verification

### usecase.1 = mechanic uses WebFetch with keyrack unlocked

| criterion | implemented? | evidence |
|-----------|--------------|----------|
| border guard fetches XAI_API_KEY from keyrack | ✅ | `keyrack.get({ for: { key: 'XAI_API_KEY' }, ... })` in guardBorder.onWebfetch.ts:29-33 |
| credential available without hardcoded paths | ✅ | removed `~/.config/rhachet/apikeys.env` source |
| inspects content via grok | ✅ | unchanged — `decideIsContentAdmissibleOnWebfetch` still called |
| WebFetch proceeds if admissible | ✅ | unchanged — `process.exit(0)` at end |

### usecase.2 = mechanic uses WebFetch with keyrack locked

| criterion | implemented? | evidence |
|-----------|--------------|----------|
| emits unlock instructions | ✅ | `console.error(keyGrant.emit.stdout)` — SDK-provided message |
| exits with code 2 | ✅ | `process.exit(2)` in guardBorder.onWebfetch.ts:38 |

### usecase.3 = mechanic uses git.commit.push with renamed token

| criterion | implemented? | evidence |
|-----------|--------------|----------|
| keyrack fetches EHMPATHY_SEATURTLE_GITHUB_TOKEN | ✅ | renamed in keyrack.operations.sh:33,48 |
| no _PROD_ in name | ✅ | sedreplace removed all `_PROD_` instances |

### usecase.4 = human unlocks once, all skills work

| criterion | implemented? | evidence |
|-----------|--------------|----------|
| XAI_API_KEY available after unlock | ✅ | uses same keyrack with owner=ehmpath env=prep |
| EHMPATHY_SEATURTLE_GITHUB_TOKEN available | ✅ | uses same keyrack with owner=ehmpath env=prep |

### exchange.1 = keyrack.get for XAI_API_KEY

| criterion | implemented? | evidence |
|-----------|--------------|----------|
| SDK from 'rhachet/keyrack' | ✅ | `import { keyrack } from 'rhachet/keyrack'` |
| keyrack.get({ key, owner, env }) | ✅ | exact pattern in guardBorder.onWebfetch.ts:29-33 |
| returns secret if unlocked | ✅ | `keyGrant.attempt.grant.key.secret` |
| returns locked status if locked | ✅ | checks `keyGrant.attempt.status !== 'granted'` |

### exchange.2 = keyrack.yml declares required keys

| criterion | implemented? | evidence |
|-----------|--------------|----------|
| XAI_API_KEY under env.prep | ✅ | in src/domain.roles/mechanic/keyrack.yml |
| EHMPATHY_SEATURTLE_GITHUB_TOKEN (renamed) | ✅ | in src/domain.roles/mechanic/keyrack.yml |

## blueprint coverage

| component | implemented? | evidence |
|-----------|--------------|----------|
| guardBorder.onWebfetch.ts keyrack SDK | ✅ | lines 29-42 |
| posttooluse hook apikeys.env removal | ✅ | removed source block |
| keyrack.yml updates | ✅ | XAI_API_KEY added, token renamed |
| keyrack.ehmpath.sh keyrack fill | ✅ | REQUIRED_KEYS replaced with fill call |
| sedreplace token rename | ✅ | all instances updated |
| test expectations | ✅ | integration tests updated |

## gaps found

**none.**

all criteria and blueprint components are implemented.

## conclusion

implementation fully covers the behavior declaration.
