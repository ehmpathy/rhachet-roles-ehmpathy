# ref.1969.hoare

grade: ☑️
cite: C. A. R. Hoare (1969). An axiomatic basis for computer programming. Communications of the ACM 12(10), 576–580. doi:10.1145/363235.363259
seen: `.raw/hoare1969.crossref.json` · `.raw/page.wiki-hoare-logic.json`

## .quote

> "A Hoare triple is of the form {P} C {Q} where P and Q are assertions and C is a command. P is named the precondition and Q the postcondition" (wikipedia)

> "{P ∧ B} S {P} ⊢ {P} while B do S done {¬B ∧ P}. Here P is the loop invariant, which is to be preserved by the loop body S." (wikipedia, the while rule)

> "it is probably better to prove the 'conditional' correctness of a program and rely on an implementation to give a warning if it has had to abandon execution of the program as a result of violation of an implementation limit." (Hoare 1969, pp. 578–579, as quoted on wikipedia)

## .supports

- precondition / postcondition / loop invariant as named, separate terms
- the last quote: prove what you can; for limits the proof cannot reach, rely on the runtime to detect and halt — the seed of "detect and fail fast"
