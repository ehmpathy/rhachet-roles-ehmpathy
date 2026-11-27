# F8 — a keyrack fault in a plan preview: one line, or the full read

## .fork
`git.branch.cutover` plan prints a quota line per meter. on a keyrack fault, apply prints the full note: the raw `org:` lines read, then the shapes that name an org. the plan preview prints `apply will refuse: <reason>` and `ask your human to fix: <lift>`.
- (a) the preview stays one line plus its lift; the reason names the shape fault (`org: lists no org`, `org: shape not readable`), and apply renders the read
- (b) the preview renders the full note, the raw lines included

## .taken
(a). a plan preview is a quota summary across several meters; the full note per meter would bury the plan under remedies that apply prints anyway, at the moment the human acts. the reason line already names the fault kind. the lift is per fault (`as_keyrack_fault_lift`): `chmod 644`, `echo 'org: <org>' > …`, `cd into a git repo`, or the org shapes.

## .rework
clean. one render function; the note function already exists and could be called from the preview.

## .confidence 80%
the wish says refused "with the shape it read". apply honors that on every surface; a reader could hold the preview owes it too.

## .verdict
best-guessed
