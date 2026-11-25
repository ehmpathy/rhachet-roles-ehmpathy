# F2 — where the 0555 file modes get fixed

## .fork
- (a) fix in this package (e.g. a postinstall chmod back to 0644 / 0755)
- (b) fix at the cause, `ehmpathy/rhachet` `setDirectoryReadonlyExecutable`; this pr adds a clamp that the packed tarball ships 0644 / 0755

## .taken
(b). evidence, read from this worktree's own install of `rhachet-roles-ehmpathy@1.43.0`:
- files under linked role dirs (`briefs/`, `skills/`) = `r-xr-xr-x`, plain `.md` included
- files outside them (`boot.yml`, `*.js`, `package.json`) = `rw-rw-r--`
- same split in `rhachet-roles-bhuild`
- `node_modules/rhachet/dist/domain.operations/invoke/link/symlinkResourceDirectories.js:31-53` chmods every linked file 0o555
- npm never marks a `.md` executable; the chmod did
- inferred, not observed: the 0555 survives a re-install because pnpm hardlinks files to its store (files keep 0555 while their dirs read 0775, as a fresh dir over an old inode would). a link-count check would confirm it. the cause stands either way: rhachet's chmod

(a) fights rhachet on every link: a postinstall restore is undone by the next `roles link` (rule.require.solve-at-cause).

## .rework
clean: the clamp test stands either way; (a) adds one postinstall command.

## .confidence 85%, why low
the wish states the item as this package's deliverable. the wisher may want a local stopgap until rhachet ships.

## .where
this pr: one pack-mode test. upstream: radio task + dream to `ehmpathy/rhachet`.

## .verdict
ruled by the director at vision approval: (b) accepted, no local stopgap
