# F8 — the sponsor on a human's own machine, with no bind

- fork: (a) require a bind everywhere · (b) on a human's machine, take git config; a bind wins
- verdict (wisher, 2026-09-26): **(b).** "they shouldnt need to even set a sponsor if its their
  machine" · "yes, explicit bind wins".
- precedence: the bind → else git config, when it names a human → else refuse. a corrupt bind
  refuses (exit 1) and never falls back to git config — a damaged bind hides an intended sponsor.
- consequences: `git.commit.set`'s unbound refusal becomes the git config fallback; the commit
  tree's `source:` leaf varies (`bound (this tree)` · `git config (this machine)`); the quota-grant
  nudge reads git config; `@self` becomes a snapshot pin.
- rework: dirty in size (many tests invert), clean in shape — ruled, so no council call remains
- where: `case=1`, `case=7`, `case=9`, yield
