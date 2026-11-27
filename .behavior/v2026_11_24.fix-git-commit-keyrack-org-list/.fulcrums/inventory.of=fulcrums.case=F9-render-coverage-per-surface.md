# F9 — render coverage: every fault on every surface, or every fault once plus each surface once

## .fork
three surfaces render a keyrack refusal: `git.commit.set`, `git.commit.push`, `git.branch.uses` (and its cutover preview). the fault kinds: `repo-absent`, `repo-unreadable`, `file-absent`, `file-unreadable`, `org-unreadable` (empty list, absent key, shape not readable, `@all`/`@this` member, repeated member).
- (a) snapshot every fault kind at `set`; pin each other surface on the faults it renders differently; assert every fault's state at the reader (`[case40]`)
- (b) snapshot the full fault × surface product

## .taken
(a). the remedy text is one shared function (`print_keyrack_org_note`) and one shared lift (`as_keyrack_fault_lift`); the surfaces differ only in where they call it. so the product would snapshot one render N times. the reader rows (`[case40]`) cover every fault kind, `[case41]` covers the gate, `set [case54]` snapshots every user-visible fault render, push covers empty list, absent file and a blocked list, and `branch.uses [case8b][t4]` covers the preview variables for empty list, absent file and mode 000.

## .rework
clean. new rows in extant data-driven tables; no prod change.

## .confidence 80%
a surface could drift in how it calls the note (an `elif` chain in push vs a direct call in set). a per-surface row per fault would catch that drift; (a) catches it only for the rows each surface carries.

## .verdict
best-guessed
