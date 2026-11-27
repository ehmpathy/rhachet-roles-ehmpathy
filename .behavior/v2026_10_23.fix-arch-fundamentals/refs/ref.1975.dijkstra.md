# ref.1975.dijkstra

grade: ✅
cite: Edsger W. Dijkstra (1975). Guarded commands, nondeterminacy and formal derivation of programs. Communications of the ACM 18(8), 453–457. doi:10.1145/360933.360975. Transcript (EWD 472): https://www.cs.utexas.edu/~EWD/transcriptions/EWD04xx/EWD472.html
seen: `.raw/dijkstra1975.crossref.json` · `.raw/page.ewd472.json`

## .quote

> "In connection with the above theorems 'P' is called 'the invariant relation' and 't' is called 'the variant function'."

> "The formal machinery only gets in motion, once we have chosen our invariant relation and our variant function. The program then gets the structure 'establish the relation P to be kept invariant'; do 'decrease t as long as possible under invariance of P' od."

> "we shall introduce necessary and sufficient —i.e. so-called 'weakest'— pre-conditions such that the mechanisms are guaranteed to produce the right result."

## .supports

- invariant first, then the operation: the program is derived from the invariant, not checked against it afterward — `rule.require.invariant-before-operation`
- weakest precondition: the least a caller must supply for the guarantee to hold
