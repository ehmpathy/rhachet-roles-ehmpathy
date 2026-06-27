# ref: dont bikeshed terms

## for reviewers

first: check if the term is already established in the codebase.

if yes: defer to convention. do not flag.

if no: then check if the new term creates ambiguity.

## step 1: check convention

search the codebase for the term. is it used consistently?

- "brain" — established for llm instances → defer, do not flag
- "skill" — established for executable capabilities → defer, do not flag
- "journey" — established for acceptance tests → defer, do not flag
- "focus" — established for review concern bundles → defer, do not flag

## step 2: only for new terms

if the term is not established, check:

1. **rule.forbid.term.addition.synonym**: does this new term duplicate an established term?
2. **rule.forbid.term.addition.ambiguous**: is this new term globally ambiguous?

## do flag

synonym additions:
- "client" when "customer" established
- "fetch" when "get" established

ambiguous additions:
- "data" (too vague)
- "handler" (overloaded)
- "process" (verb or noun?)
