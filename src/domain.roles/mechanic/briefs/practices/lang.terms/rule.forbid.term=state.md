### .rule = forbid-term-state

#### .what
the term `state` is forbidden — in its noun, its plural, its verb, and react's `useState`. it is overloaded: one word for six senses

#### .scope
- code: variable names, function names, type names, comments
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions
- the bare word and react's hook: the hook blocks these at write time
- compound identifiers (`orderState`, `stateMachine`, `app_state`): in scope, but the hook passes them — `_` and a camel hump carry no word boundary — so review catches them

#### .why
- a reader must guess which sense was meant; two readers guess two senses
- each sense has a sharper word, and the sharper word names what the code contains
- `useState` names a react data container by the overloaded word and hides where the value persists

#### .senses conflated by "state"

| sense | 👍 sharper word |
| --- | --- |
| an address region | `region` |
| a stored value | `record`, `snapshot` |
| a lifecycle stage | `status` |
| a case under test | `scenario`, `condition` |
| a value in memory | `data`, `cache` |
| the verb | `declare`, `say` |
| the `[...noun][state]?` suffix of `rule.require.treestruct` | `[...noun][status]?` — `invoicedraft`, `userfound` |
| react's `useState` | a wrapper hook your repo owns, named for where the value persists — in memory, in the url query, in the url path |

#### .exempt
- a verbatim quote (a title, a cited sentence)
- a name an external api dictates — stripe `address.state`, the oauth `state` param, `location.state`, `getState()` from a library. the name is not yours to change: retry the write, and wrap it once under a name for its sense
- the one wrapper body that calls react's hook

#### .enforcement
- use of `state`, `states`, or `useState` outside the exempt cases = **BLOCKER**
- the `pretooluse.forbid-terms.blocklist` hook blocks the first write of the bare word; a deliberate retry passes, for the exempt cases above
- extant uses, the older briefs that teach the `[state]` suffix among them, are swept on touch (`rule.prefer.wickup-touched-prose`), never in a mass rewrite

#### .see also
- `philosophy.why-we-ban-terms` — why a heavy word gets banned
- `rule.forbid.term=state.example=demo` — a 👎/👍 demo
- `rule.require.ubiqlang` — one word per concept
- `rule.require.treestruct` — the `[...noun][status]?` resource shape
- `rule.forbid.term=normalize` — a peer overloaded term
