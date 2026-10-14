# F18 — the block lists each layer's state only when no layer holds an allow

- **fork**: (a) per-layer state on the block only when the union is empty · (b) a per-layer line
  (`read: settings.repo.json (12) · settings.json (3) · …`) on every block
- **taken**: (a). the approved vision keeps the old-layout block message byte-identical, and every
  Bash call that misses the allowlist prints this block; a layer line on each one is noise on the
  common path. the defect #895 named, a list built from the wrong files, is closed at its cause:
  the hook now reads the files claude reads. a partial list still shows its config dir (F5), and a
  corrupt layer is named on every block (`💥 MalfunctionError`)
- **rework**: clean — one function, `print_allowlist`; its snapshots
- **confidence**: 80%
- **where**: peer r010 i005 blocker.2; `pretooluse.check-permissions.sh` `print_allowlist`
- **verdict**: —
