# S4 — open-hours gate is the global commit switch

## .said
the open-hours gate is the global commit switch: git.commit.uses --global (check_global_blocker); cite it there.

## .settled
"open-hours" in the wish = the global blocker, toggled by `git.commit.uses --global`, enforced by `check_global_blocker`. verification cites that guard (push.sh `:268-287`, set.sh `:709`). it already sits in the gate walk as "global block" (t2p, t2s); open-hours is not a separate gate.

## .landed
| artifact | where |
|---|---|
| verification citation | the 5.3 verification stone, when it runs |
