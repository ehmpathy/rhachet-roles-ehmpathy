# F3 — how a robot login is recognized

## .the fork
- (a) github attributes only: `user.type == "Bot"` or `[bot]` in the login
- (b) (a) plus the seaturtle roster in `git.commit/keyrack.operations.sh`

## .taken
(b). the clone's own account `ehm-seaturtle` reads `type: User` (verified: reviews on #1022 list
`{"login":"ehm-seaturtle","type":"User"}`). no github attribute separates it from a person, so the
roster the repo already declares must be cited.

## .rework
clean: one predicate.

## .confidence
90%. a robot account absent from the roster still reads as human; that is the roster's known gap
(`keyrack.operations.sh` notes it), not new to this change.

## .where
`is_login_robot` predicate beside the roster.

## .verdict
awaits the commander.
