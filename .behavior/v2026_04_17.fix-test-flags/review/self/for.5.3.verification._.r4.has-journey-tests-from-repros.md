# self-review r4: has-journey-tests-from-repros

## repros artifact check

searched for repros artifact:
```
ls .behavior/v2026_04_17.fix-test-flags/*.repros*.md
# no files found
```

no repros artifact exists for this behavior. this PR went directly from wish → vision → execution without a repros phase.

## why no repros

this behavior is a CLI improvement to an extant skill. the journey was clear from the wish:
- user tries `-- --testNamePattern` 
- skill blocks with helpful tip
- user learns `--scope 'name(...)'`

the extant test infrastructure (git.repo.test.play.integration.test.ts) already has journey tests. the new behavior (case14) was added to this extant structure.

## journey coverage from vision

even without formal repros, the vision documented the expected journeys:

| vision journey | test coverage |
|----------------|---------------|
| block --testNamePattern | covered by constraint validation |
| --scope 'name(foo)' | covered by scope parser |
| no tests without scope = exit 0 | case14 |

## summary

no repros artifact to reference. journey tests derive from vision directly. case14 covers the new "no tests without scope" journey.
