# F26 — every nudge-record fault names the config dir as the first remedy

- **fork**: main's record faults (#917) all end `delete the file and the hook recreates it`.
  (a) prepend `make <config dir> a writable dir, or` to that one shared remedy · (b) keep main's
  text · (c) a remedy per fault kind (create, read, lock made, lock held, lock taken over)
- **taken**: (a). this branch moved the record into the config dir, which for a hash actor is
  `$CLAUDE_CONFIG_DIR`, not the repo `.claude`; the create and lock-made faults there come from a
  dir the clone cannot write, where "delete the file" names a file that does not exist
- **the cost, stated**: for a live-holder lock fault, "make the dir writable" does not apply;
  the clause is noise there. (c) fixes that, at the cost of five remedy strings
- **rework**: clean — one string in `get_block_text`, or a `case` on the fault kind; five snaps
- **confidence**: 70% — (c) reads better; (a) is the smallest change atop main
- **where**: `pretooluse.check-permissions.sh` `get_block_text`; [case45][t0], [case49][t0,t1,t4],
  [case50][t0]
- **verdict**: —
