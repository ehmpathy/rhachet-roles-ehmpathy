# F15 — i004 items held: the 40s cost clock, the regenerated settings file

## the fork

5.3 i004 `enroll-verif-test-intent` raised two points this round does not change:

1. `boot.budget`'s `roles cost` spawn timeout went 120s → 40s. it is stricter, and a loaded host
   could trip it on the whole-role cost of every role.
2. `.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.repo.json` shows a diff: a
   `Write(.route/**)` allow dropped, an `Edit(*/**/.route/**)` deny added.

and `enroll-verif-snapshot-coverage` raised two more:

3. acceptance snaps one negative case; `--subject <unknown>`, `--subject 101,code.prod` (c13), and a
   `roles cost` failure are not walked end to end.
4. case 5 is not walked through a 101 seat's own settings.

A: change each. B: hold all four.

## taken

B.

1. superseded at i006: the clock is split. the extant whole-role costs keep their original 120s
   (`TIMEOUT_MS_COST_ALONE`); only the new paired spawns (slice + union, the isolation pairs) take
   40s (`TIMEOUT_MS_COST_PAIRED`), so each fails as a named `ETIMEDOUT` inside jest's 90s hook clock.
2. rhachet regenerates that file at link; it is not this pr's change, and the director's order keeps
   it out of the commit (explicit add, then `--unstaged ignore`). no file this pr ships changes a
   permission.
3. an unknown subject is proven at the integration grain (`boot.yml` `[t2]`); c13 is an itemized
   alterpath whose dedup is rhachet's (a dream holds it); a `roles cost` failure is rhachet's
   surface, and `[readout]` proves this repo's parse fails loud.
4. `roles link` writes no hooks (the linked `settings.of.repo.json` reads `{}`; a clamp tried at
   i004 went red on it). hooks land at `roles init`, which takes no subject, and
   `getMechanicRole.hooks-reachable` grades that registry.

## rework

clean — a clock number, and a file the commit never stages.

## confidence — 85%, and why it is low

a host slower than today's could make 40s flake for the largest roles; the rework is one number.

## where

`src/domain.roles/boot.budget.integration.test.ts` (`getOneBootCost`, `getOneBootCostInPlace`) ·
the commit's staged set

## verdict

open
