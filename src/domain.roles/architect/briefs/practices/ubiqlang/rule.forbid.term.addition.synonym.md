# tldr

## severity: blocker

forbid synonym additions: do not introduce terms that duplicate established vocabulary.

if the codebase uses "customer", do not introduce "client" for the same concept.

---
---
---

# deets

## .what

review blueprints for new terms that are synonyms of established terms.

## .why

synonyms are the biggest culprit of ambiguity. one concept needs one canonical term.

## severity: blocker

synonym additions block merge. use the established term.

## .scope

applies to new terms only.

if the term is already established in the codebase, defer to convention.

## .how

1. identify new terms in the blueprint
2. for each new term, search the codebase for synonyms
3. if an established term exists for the same concept, flag it

## .examples

### blocker — synonym addition

blueprint introduces "client" but codebase uses "customer":
- flag: use "customer" instead

blueprint introduces "fetch" but codebase uses "get":
- flag: use "get" instead

blueprint introduces "task" but codebase uses "job":
- flag: use "job" instead

### not a blocker

blueprint uses "brain" which is already established in the codebase:
- no flag: defer to convention
