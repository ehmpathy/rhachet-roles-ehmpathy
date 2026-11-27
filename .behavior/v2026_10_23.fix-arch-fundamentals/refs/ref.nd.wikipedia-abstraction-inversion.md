# ref.nd.wikipedia-abstraction-inversion

grade: 🟡 (secondary; the article carries "original research" and "excessive examples" flags). the origin of the term is unknown: the article's one source "says (without references) that the term derives from critiques of the Ada rendezvous"
cite: Wikipedia (last edited 2026-07-25). Abstraction inversion. https://en.wikipedia.org/wiki/Abstraction_inversion
seen: `.raw/page.wiki-abstraction-inversion.json`

## .quote

> "In computer programming, abstraction inversion is an anti-pattern arising when users of a construct need functions implemented within it but not exposed by its interface. The result is that the users re-implement the required functions in terms of the interface, which in its turn uses the internal implementation of the same functions."

## .supports

- `tactic=escape-hatch`: the failure it prevents — callers rebuild, on top, a primitive the abstraction hid below
