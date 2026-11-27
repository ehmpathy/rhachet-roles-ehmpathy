## .rule = forbid-term-map

### .what
term `map` forbidden — overloaded; it reads at least seven ways

### .scope
- code: function names, variable names, type names, comments
- files: filenames, directory names
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions

exempt: an identifier we do not name (`.map()`, `Map`), and a verbatim quote

### .why
- each sense is a different shape: a data structure, a transform, a grid, a plan, a picture
- a reader must guess which, and a wrong guess reads a table as a function or a plan as a lookup
- the verb hides the verb we sanction: a cast is `as*` (`rule.require.get-set-gen-verbs`)

### .enforcement
use of `map` = **blocker**

the term hook (`terms.blocklist.jsonc`) blocks the first write that holds it. the hook cannot tell code from prose, so `.map(` and `Map` trip it too: retry an exempt identifier unchanged

### .alternatives

| the sense meant | 👎 vague | 👍 precise |
|---|---|---|
| a key → value lookup | `userMap`, "the id map" | `usersByUuid`, "lookup", "index" |
| a transform of each element | `mapUsers`, "map X to Y" | `asUserEmails`, "cast X to Y" |
| a correspondence between two vocabularies | "field map", "the schema map" | "correspondence table", an `as$Target` transformer |
| a grid over axes | "the kind × grain map" | "the dimensions", "the product table" |
| a plan | "roadmap" | "plan", "sequence", "milestones" |
| a layout of a system | "dependency map", "architecture map" | "dependency graph", "diagram", "tree" |
| a representation of another thing | "the schema is a map of the domain" | "the schema describes the domain", "a description" |

### .see also
- `philosophy.why-we-ban-terms` — why a heavy word gets banned
- `rule.forbid.term=map.example=demo` — a 👎/👍 demo
- `rule.forbid.term=model` — its twin, same shape of ban
- `rule.forbid.term=state` — another overloaded term, same shape of ban
- `rule.require.get-set-gen-verbs` — `as*` names the cast
- `rule.require.ubiqlang` — one word, one sense
