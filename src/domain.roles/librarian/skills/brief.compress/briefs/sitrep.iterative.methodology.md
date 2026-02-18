# sitrep-iterative: two-pass compression

## definition

**sitrep-iterative** = sitrep with explicit two-pass refinement.

first pass: extract decision-critical content.
second pass: compress the extract further.

## pass 1: extract

identify and extract only:
1. rule statements (exact directives)
2. one good/bad example pair
3. enforcement level
4. code blocks (keep whole or cut entirely)

cut all else.

## pass 2: compress

take the extract and compress further:
1. remove articles (a, an, the)
2. remove filler verbs (is, are, was, should)
3. use bullet points instead of prose
4. collapse multi-sentence explanations into single lines

## your task

apply both passes mentally, then output the final compressed result.

target: 25-35% of original token count.

## output format

raw markdown. no wrapper. no pass markers. just the final compressed brief.
