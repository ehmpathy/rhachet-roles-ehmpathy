### .rule = require-order-noun-adj

#### .what
always use `[noun][status/adjective]` order for variable and property names

#### .pattern
```
{noun}{State}
{noun}{Qualifier}
{noun}{Temporal}
```

#### .why
- **autocomplete groups** — `user*` reveals all user variants in scope
- **scan efficiency** — the noun (the *what*) comes first; the status (the *which*) comes second
- **gerund elimination** — past participles replace gerunds naturally (`userFound` not `existingUser`)
- **domain clarity** — forces you to name the noun before you qualify it

#### .categories

##### temporal qualifiers
| 👎 bad | 👍 good |
|--------|---------|
| `previousValue` | `valuePrevious` |
| `currentOwner` | `ownerCurrent` |
| `originalRequest` | `requestOriginal` |
| `beforeState` | `stateBefore` |
| `afterState` | `stateAfter` |

##### status qualifiers (past participles)
| 👎 bad | 👍 good |
|--------|---------|
| `existingUser` | `userFound` |
| `foundRecord` | `recordFound` |
| `createdInvoice` | `invoiceCreated` |
| `updatedCustomer` | `customerUpdated` |
| `deletedItem` | `itemDeleted` |
| `matchingResult` | `resultMatched` |

##### descriptive qualifiers
| 👎 bad | 👍 good |
|--------|---------|
| `validInput` | `inputValid` |
| `emptyList` | `listEmpty` |
| `activeSession` | `sessionActive` |
| `primaryKey` | `keyPrimary` |

#### .benefits

##### autocomplete discovery
```ts
// type "user" and see all variants:
userFound
userCreated
userUpdated
userBefore
userAfter
userCurrent
```

##### consistent mental picture
- first: *what entity?* → `user`, `invoice`, `record`
- then: *which one?* → `Found`, `Created`, `Before`, `After`

##### natural gerund elimination
- gerund pattern: `existingUser`, `matchingRecord`, `remainingItems`
- noun-adj pattern: `userFound`, `recordMatched`, `itemsLeft`

#### .exceptions
- domain terms with established order (e.g., `primaryKey` in sql contexts)
- external api constraints where you must match their names
- document with `.note` when exceptions are necessary

#### .see also
- `rule.forbid.gerunds` — gerund elimination reinforces this pattern
- `rule.require.treestruct` — broader name structure guidance
