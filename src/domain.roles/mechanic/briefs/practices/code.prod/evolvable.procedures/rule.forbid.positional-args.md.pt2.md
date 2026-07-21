ordered args are forbidden

we require the `(input, context) => {}` procedure pattern

never allow ordered args

we required key value input args for readability and observability and evolvability

---

many, many reasons why inputs should always be one key-value object - followed by a context object

---

## .exemption = single-value transformers

single-value transformer prefixes (`as*`, `is*`) may take their one value **positionally**.

- a single-value transformer has exactly one input by definition (`asFoo(x)`, `asFooFromBar(bar)`, `isBar(x)`)
- the named-object wrapper earns its keep on **multi-arg** calls (order-independence + self-documentation) — for a lone value it adds ceremony with no benefit

so: `asDeclaredAwsIamPolicyStatement(statement)` and `asZoneAddress(raw)` are fine.

the named-input requirement still applies to any function with **2+ inputs** or **optional config** — even a transformer once it grows a second argument.

### enforcement

- an `as*`/`is*` transformer that takes exactly one positional value = **allowed** (not a violation)
- a transformer with 2+ inputs passed positionally = **blocker** (use `(input, ...)`)
