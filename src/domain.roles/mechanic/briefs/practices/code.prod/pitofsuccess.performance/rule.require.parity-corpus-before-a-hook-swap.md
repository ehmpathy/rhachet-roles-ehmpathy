# rule.require.parity-corpus-before-a-hook-swap

> **a rewrite of a hook, or a fast head added inside it, lands only with a corpus whose verdicts equal the prior hook's: the same exit code, stdout, and stderr, on inputs the prior hook passes and inputs it refuses. the corpus runs red first, then green.**

## .the steps

| step | what | what it proves |
|---|---|---|
| 1 | write the corpus: one named case per input class, each run through both the prior hook (at HEAD) and the rewrite, the verdicts compared | the rewrite and the prior hook agree, not that the rewrite looks right |
| 2 | run it red: against a rewrite loosened on purpose (a rule dropped, a guess let through) | the corpus can tell a wrong rewrite from a right one; a corpus that stays green on a broken rewrite guards naught |
| 3 | run it green against the real rewrite | parity on every case |
| 4 | quote the red run in the change | the reviewer sees the corpus bite |

## .what the corpus covers

- cases the prior hook refuses and cases it passes, so a loosened rule fails the suite
- the fail-closed case: a fast head that cannot prove an input falls through to the full check, and the guard still blocks
- the fall-through case: an input the fast head cannot prove reaches the full check with the stdin unchanged
- a stub for any check that needs a network or a key; the real one runs where it can

## .the case (2026-11-26, uladkasach/nheuron)

- a toy pair kept parity: `parity: 2/2` green, and a planted mismatch read `parity: 1/2` and exited 2
- forbid-planmode: one parity case per corpus entry, plus the fail-closed case
- boot-behavior: five parity cases (an unbound repo, a flag of another branch, a bound branch byte for byte, two binds that clash, a dir that is no git repo)

## .enforcement

- a hook rewrite or fast head with no parity corpus = **blocker**
- a corpus never run red = **blocker**
- a corpus with no case the prior hook refuses = **blocker**

## .see also

- `rule.forbid.costly-hot-paths` — the proof a fast head owes
- `rule.require.count-starts-with-strace`
