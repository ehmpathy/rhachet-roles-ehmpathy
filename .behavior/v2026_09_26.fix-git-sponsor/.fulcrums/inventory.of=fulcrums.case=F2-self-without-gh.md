# F2 — gh under `@self`

- fork: use gh as a clone detector beside git config · never read gh at all
- taken, at first: gh as a clone check, bind when gh is absent or failed
- verdict (wisher, 2026-09-26): **never.** "we already said never to use gh for @self set. only
  ever git config." the gh check, its timeout, its failure branches, and the `GH_TOKEN` row are all
  deleted. the residual cells they left (a human-shaped git config on the clone's host) dissolve
  under F6's definition.
- rework: clean — the gh path is deletion
- where: `case=_` forbidden cells, dimensions (D5/D6 removed)
