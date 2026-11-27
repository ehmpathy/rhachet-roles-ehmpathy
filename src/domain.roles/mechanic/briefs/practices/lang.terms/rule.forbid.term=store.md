### .rule = forbid-term-store

#### .what
the term `store` is forbidden — noun, plural, and verb. it is overloaded: one word for five senses. `storage` is clearer; never `store`

#### .scope
- code: variable names, function names, type names, comments
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions
- the bare word: the hook blocks it at write time
- `stored`, `storage`, and `restore` are not banned; the hook passes them
- compound identifiers (`useSwellStore`, `storeUuid`, `kv_store`): in scope, but the hook passes them — `_` and a camel hump carry no word boundary — so review catches them

#### .why
- a reader must guess which sense was meant: the database? a cache? a redux container? a shop?
- each sense has a sharper word, and the sharper word names where the data lives and what contains it

#### .senses conflated by "store"

| sense | 👍 sharper word |
| --- | --- |
| where data persists, in general | `storage` |
| a database | `database`, or its engine by name |
| a cache | `cache` |
| a client-side data container (redux, zustand, pinia) | a name for what it contains and where it persists — `swellsInMemory`, `useSwellsPersistedInUrl` |
| a shop | `shop` |
| the verb | `persist`; the dao verb `set` |

#### .exempt
- a verbatim quote (a title, a cited sentence)
- a proper noun — the app store, a shop's name
- a name an external api dictates — redux `createStore`, a vendor's "object store" product. the name is not yours to change: retry the write, and wrap it once under a name for its sense

#### .enforcement
- use of `store` or `stores` outside the exempt cases = **BLOCKER**
- the `pretooluse.forbid-terms.blocklist` hook blocks the first write of the bare word; a deliberate retry passes, for the exempt cases above
- extant uses are swept on touch (`rule.prefer.wickup-touched-prose`), never in a mass rewrite

#### .see also
- `philosophy.why-we-ban-terms` — why a heavy word gets banned
- `rule.forbid.term=store.example=demo` — a 👎/👍 demo
- `rule.require.ubiqlang` — one word per concept
- `rule.forbid.term=state` — a peer overloaded term, often paired with it
- `rule.forbid.term=map` · `rule.forbid.term=model` — the same shape of ban
