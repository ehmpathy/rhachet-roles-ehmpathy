## .rule = forbid-term-model

### .what
term `model` forbidden — overloaded; it reads at least six ways

### .scope
- code: function names, variable names, type names, comments
- files: filenames, directory names
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions

exempt: an identifier we do not name (a vendor api's `model` parameter), and a verbatim quote or cited title

### .why
- each sense is a different referent: a brain, a schema, a domain object, a picture in a head, an exemplar, an act
- a reader must guess which, and "update the model" could mean a retrain, a migration, or a class edit
- each sense already has a precise word in our ubiqlang

### .enforcement
use of `model` = **blocker**

the term hook (`terms.blocklist.jsonc`) blocks the first write that holds it. an exempt identifier or quote: retry it unchanged

### .alternatives

| the sense meant | 👎 vague | 👍 precise |
|---|---|---|
| an llm | "the model replied", "frontier models" | "the brain replied", "frontier brains" |
| a stored shape | "the data model", "the db model" | "the schema", "the table" |
| a domain concept in code | "the domain model", "the invoice model" | "the domain objects", "`Invoice`" |
| a picture in a head | "mental model" | "mental picture", "grasp", "expectation" |
| an exemplar | "a model answer" | "an exemplar", "a demo" |
| a declared problem for a solver | "declare the model" | "declare the formulation" |
| the verb | "model it in code", "models the domain" | "declare it in code", "describes the domain" |

### .see also
- `philosophy.why-we-ban-terms` — why a heavy word gets banned
- `rule.forbid.term=model.example=demo` — a 👎/👍 demo
- `rule.forbid.term=map` — its twin, same shape of ban
- `rule.require.ubiqlang` — one word, one sense
