# self-review r2: has-zero-deferrals

## deeper scan

re-read blueprint line by line with fresh eyes.

### line 117: `--when <context>  # optional, for future use`

**concern**: "for future use" sounds like deferral.

**investigation**: checked criteria usecase.6:
```
given([case1] any repo state)
  when([t0] `rhx git.repo.test --what lint --when hook.onStop` is run)
    then(behavior is identical to without --when)
      sothat(context hint is for future use only)
```

**verdict**: the flag IS implemented. "for future use" means the flag exists but doesn't change behavior — by design. the criteria explicitly says "behavior is identical to without --when". this is intentional design, not a deferral.

### lines 116: `--what <lint|types|unit|integration|format>`

**concern**: blueprint shows multiple test types, but criteria only cover lint.

**investigation**: checked vision usecases table:
```
| future | run other tests | `rhx git.repo.test --what types` / `--what unit` |
```

**verdict**: vision explicitly marks other test types as "future". the wish says "e.g., `rhx git.repo.test --what lint`" — lint is the scope. this is a wisher-approved scope boundary, not an unacceptable deferral.

### full text search for deferral keywords

searched blueprint for: "deferred", "defer", "future", "later", "out of scope", "todo"

- line 117: "for future use" — analyzed above, acceptable
- no other matches

## cross-reference with criteria

all 7 usecases from criteria mapped to blueprint:

| criteria usecase | blueprint coverage |
|-----------------|-------------------|
| usecase.1: lint passes | test coverage + exit 0 |
| usecase.2: lint fails | test coverage + exit 2 + defect count + log + tip |
| usecase.3: malfunction | test coverage + exit 1 |
| usecase.4: no package.json | test coverage + exit 1 |
| usecase.5: log directory | test coverage + findsert .gitignore |
| usecase.6: --when flag | contracts section + flag accepted |
| usecase.7: log file content | test coverage + log files section |

no criteria usecase is deferred.

## verdict

zero unacceptable deferrals. all deferrals are wisher-approved scope boundaries explicitly marked in the vision.
