# tldr

## severity: blocker

forbid ambiguous additions: do not introduce terms that are globally ambiguous.

terms like "data", "handler", "process" are overloaded and create confusion.

---
---
---

# deets

## .what

review blueprints for new terms that are globally ambiguous or overloaded.

## .why

ambiguous terms cause miscommunication. choose specific terms.

## severity: blocker

ambiguous additions block merge. use specific terms.

## .scope

applies to new terms only.

if the term is already established in the codebase, defer to convention.

## .how

1. identify new terms in the blueprint
2. for each new term, check if it is globally ambiguous
3. if the term is overloaded or vague, flag it

## .examples

### blocker — ambiguous addition

blueprint introduces "data":
- flag: too vague. what data? use specific term.

blueprint introduces "handler":
- flag: overloaded. what does it handle? use specific term.

blueprint introduces "process":
- flag: verb or noun? use specific term.

### not a blocker

blueprint uses "brain" for llm instances:
- no flag: specific within this domain
