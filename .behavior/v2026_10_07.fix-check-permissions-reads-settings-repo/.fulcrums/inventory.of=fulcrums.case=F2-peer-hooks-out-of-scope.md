# F2 — peer hooks + inits out of scope

- **fork**: (a) fix only `pretooluse.check-permissions.sh`, per the wish · (b) also fix `permissionrequest.decide-permissions.sh`, `sessionstart.notify-permissions.sh`, `init.claude.permissions.sh`, `init.claude.sh`, per issue #895
- **taken**: (a). the wish names one hook; the peers each carry their own large test suites. a shared layer lookup across them would ripple (dirty to pull in)
- **rework**: clean to extend later — each peer copies the same five-file read
- **confidence**: 80%. low because #895 lists the peers in one breath, and a wisher may want them together
- **where**: `1.vision.yield.md` .what is awkward
- **dream**: `dreams/v2026_10_07.fix.peer-permission-hooks-read-settings-repo.md`
- **verdict**: overruled by the wisher, 2026-10-07 — take (b), all of #895. the vision now covers decide, notify, and both inits (cases 11–14); the readers share one layer rule. the dream is superseded
