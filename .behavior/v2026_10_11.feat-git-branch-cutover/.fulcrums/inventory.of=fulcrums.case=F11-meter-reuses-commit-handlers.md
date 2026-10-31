# F11: `git.branch.uses` reuses the commit meter's global + org handlers, parameterized

- **the fork**: (a) a full peer copy of the commit meter family (~1,350 lines of hardened readers +
  handlers); (b) parameterize the shared readers and the global/org handlers by meter slug and
  gated noun, default = the commit meter, and serve both meters from one copy; (c) a new generic
  meter skill that both families migrate onto
- **taken**: (b). the global and org readers carry many rounds of repairs (torn reads, a
  directory at the path, a 0-byte file, a non-boolean leaf). a copy would fork those repairs, and
  the next fix would land in one copy only. (b) is ~35 line edits with the commit family's output
  byte-identical at the default — proven by its own snapshots. (c) is the clean end state but a
  migration of the commit family, which is out of this wish's scope
- **rework**: clean — the parameters are additive; a later move to (c) starts from one copy
- **confidence**: 75% — it touches `git.commit.*` files in a branch-verb change
- **where**: `git.commit.operations.sh`, `git.commit.uses.global.sh`, `git.commit.uses.org.sh`;
  local handler is new (`git.branch.uses.local.sh`) since the branch meter has no push/stage axes
- **verdict**: —
