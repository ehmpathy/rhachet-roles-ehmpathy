# git.release state machine diagram

## top-level flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                git.release                                    │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │   parse arguments     │
                          └───────────┬───────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
            ▼                         ▼                         ▼
     ┌────────────┐           ┌────────────┐           ┌────────────┐
     │ --to main  │           │ --to prod  │           │ --to prod  │
     │ from feat  │           │ from feat  │           │ --from main│
     └─────┬──────┘           └─────┬──────┘           └─────┬──────┘
           │                        │                        │
           ▼                        ▼                        ▼
     ┌──────────┐            ┌───────────┐            ┌───────────┐
     │ feat PR  │            │ feat PR   │            │release PR │
     │  flow    │            │   flow    │            │  flow     │
     └────┬─────┘            └─────┬─────┘            └─────┬─────┘
          │                        │                        │
          ▼                        ▼                        │
       (done)               ┌───────────┐                   │
                            │release PR │◄──────────────────┘
                            │  flow     │
                            └─────┬─────┘
                                  │
                                  ▼
                            ┌───────────┐
                            │   tags    │
                            │   flow    │
                            └─────┬─────┘
                                  │
                                  ▼
                               (done)
```

## PR flow (feature PR or release PR)

```
                              ┌─────────┐
                              │  START  │
                              └────┬────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │  lookup PR     │
                          │  (gh pr list)  │
                          └───────┬────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
 ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
 │  UNFOUND    │          │   OPEN      │          │   MERGED    │
 │             │          │             │          │             │
 │ crickets... │          │             │          │ cowabunga!  │
 │ exit 2      │          │             │          │ exit 0      │
 │ hint: push  │          │             │          │ (continue)  │
 └─────────────┘          └──────┬──────┘          └─────────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │  check mergeable    │
                      │  state              │
                      └──────────┬──────────┘
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     │                           │                           │
     ▼                           ▼                           ▼
┌──────────┐              ┌──────────┐              ┌──────────┐
│ BEHIND   │              │  DIRTY   │              │MERGEABLE │
│          │              │          │              │          │
│ hold up  │              │ hold up  │              │          │
│ exit 2   │              │ exit 2   │              │          │
│ hint:    │              │ hint:    │              │          │
│ rebase   │              │ rebase   │              │          │
│          │              │+conflicts│              │          │
└──────────┘              └──────────┘              └────┬─────┘
                                                         │
                                                         ▼
                                              ┌─────────────────────┐
                                              │  check CI status    │
                                              └──────────┬──────────┘
                                                         │
                    ┌────────────────────────────────────┼────────────────────────────────────┐
                    │                                    │                                    │
                    ▼                                    ▼                                    ▼
            ┌─────────────┐                      ┌─────────────┐                      ┌─────────────┐
            │  INFLIGHT   │                      │   PASSED    │                      │   FAILED    │
            │             │                      │             │                      │             │
            │ 🐢 N checks │                      │ 👌 passed   │                      │ ⚓ failed   │
            │ in progress │                      │             │                      │             │
            └──────┬──────┘                      └──────┬──────┘                      │ bummer...   │
                   │                                    │                             │ exit 2      │
                   │                                    │                             │ hint: retry │
                   │                                    │                             └─────────────┘
                   │                                    ▼
                   │                         ┌─────────────────────┐
                   │                         │  check automerge    │
                   │                         └──────────┬──────────┘
                   │                                    │
                   │                  ┌─────────────────┼─────────────────┐
                   │                  │                 │                 │
                   │                  ▼                 ▼                 ▼
                   │          ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
                   │          │  UNFOUND    │   │   FOUND     │   │   ADDED     │
                   │          │             │   │             │   │             │
                   │          │ 🌴 unfound  │   │ 🌴 [found]  │   │ 🌴 [added]  │
                   │          │             │   │             │   │             │
                   │          └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
                   │                 │                 │                 │
                   └─────────────────┴─────────────────┴─────────────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────┐
                                            │    check --mode     │
                                            └──────────┬──────────┘
                                                       │
                         ┌─────────────────────────────┼─────────────────────────────┐
                         │                             │                             │
                         ▼                             ▼                             ▼
                  ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
                  │    PLAN     │              │   WATCH     │              │   APPLY     │
                  │             │              │             │              │             │
                  │ show status │              │ poll CI     │              │ add auto?   │
                  │ show hint   │              │ no automerge│              │ poll CI     │
                  │ exit 0      │              │             │              │             │
                  └─────────────┘              └──────┬──────┘              └──────┬──────┘
                                                      │                           │
                                                      └───────────┬───────────────┘
                                                                  │
                                                                  ▼
                                                       ┌─────────────────────┐
                                                       │    WATCH LOOP       │
                                                       │    (see below)      │
                                                       └─────────────────────┘
```

## watch loop

```
                              ┌─────────┐
                              │  START  │
                              │  WATCH  │
                              └────┬────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │  poll status   │◄─────────────────┐
                          │  (gh pr view)  │                  │
                          └───────┬────────┘                  │
                                  │                           │
        ┌─────────────────────────┼─────────────────────────┐ │
        │                         │                         │ │
        ▼                         ▼                         ▼ │
 ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
 │   MERGED    │          │  INFLIGHT   │          │   FAILED    │
 │             │          │             │          │             │
 │ ✨ done!    │          │ 💤 sleep    │──────────┼────────────►│
 │ exit 0      │          │    5s       │          │ ⚓ failed   │
 └─────────────┘          └──────┬──────┘          │ exit 2      │
                                 │                 └─────────────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │ check timeout  │
                        └───────┬────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
      ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
      │  TIMEOUT    │   │  CONTINUE   │   │   REBASE    │
      │             │   │             │   │   NEEDED    │
      │ ⏱️ timeout  │   │ (loop back) │───┼───────────►│
      │ exit 1      │   └─────────────┘   │ ⚓ rebase   │
      └─────────────┘                     │ exit 2      │
                                          └─────────────┘


                    ┌────────────────────────────────────┐
                    │         WATCH OUTPUT               │
                    ├────────────────────────────────────┤
                    │  💤 N left, Xs in action, Xs watch │
                    │  💤 await merge, Xs in action      │
                    │  ✨ done! Xs in action, Xs watched │
                    │  ⚓ N check(s) failed              │
                    └────────────────────────────────────┘
```

## tag workflow flow

```
                              ┌─────────┐
                              │  START  │
                              │  TAGS   │
                              └────┬────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │  get latest    │
                          │  tag           │
                          └───────┬────────┘
                                  │
                                  ▼
                          ┌────────────────┐
                          │  lookup runs   │
                          │  for tag       │
                          └───────┬────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
 ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
 │  UNFOUND    │          │  INFLIGHT   │          │  COMPLETE   │
 │             │          │             │          │             │
 │ no runs     │          │ poll until  │          │ passed or   │
 │ exit 0      │          │ complete    │          │ failed      │
 └─────────────┘          └──────┬──────┘          └──────┬──────┘
                                 │                        │
                                 │              ┌─────────┴─────────┐
                                 │              │                   │
                                 │              ▼                   ▼
                                 │       ┌─────────────┐     ┌─────────────┐
                                 │       │   PASSED    │     │   FAILED    │
                                 │       │             │     │             │
                                 │       │ ✨ done!    │     │ ⚓ failed   │
                                 │       │ exit 0      │     │ exit 2      │
                                 │       └─────────────┘     │ hint: retry │
                                 │                           └─────────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │    TAG WATCH LOOP   │
                      │    (same as PR)     │
                      └─────────────────────┘
```

## automerge state transitions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTOMERGE STATES                                     │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │  UNFOUND    │
                              │             │
                              │ 🌴 unfound  │
                              │ (use --mode │
                              │  apply)     │
                              └──────┬──────┘
                                     │
                                     │ --mode apply
                                     │ (gh pr merge --auto)
                                     │
                                     ▼
                              ┌─────────────┐
                              │   ADDED     │
                              │             │
                              │ 🌴 [added]  │
                              └──────┬──────┘
                                     │
                                     │ (already set on
                                     │  subsequent runs)
                                     │
                                     ▼
                              ┌─────────────┐
                              │   FOUND     │
                              │             │
                              │ 🌴 [found]  │
                              └─────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                      HINT DECISION TABLE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   automerge    mode      hint                                               │
│   ─────────    ────      ────                                               │
│   UNFOUND      plan      "use --mode apply to enable automerge and watch"   │
│   UNFOUND      watch     "use --mode apply to add automerge"                │
│   FOUND        plan      (no hint — ready to watch)                         │
│   FOUND        watch     (no hint, poll active)                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## mode decision tree

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MODE SELECTION                                     │
└─────────────────────────────────────────────────────────────────────────────┘

                                 ┌─────────┐
                                 │  args   │
                                 └────┬────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
            ▼                         ▼                         ▼
     ┌────────────┐           ┌────────────┐           ┌────────────┐
     │ --mode     │           │ --watch    │           │ (default)  │
     │   apply    │           │            │           │            │
     └─────┬──────┘           └─────┬──────┘           └─────┬──────┘
           │                        │                        │
           ▼                        ▼                        ▼
     ┌────────────┐           ┌────────────┐           ┌────────────┐
     │ check      │           │ WATCH      │           │ PLAN       │
     │ permission │           │            │           │            │
     └─────┬──────┘           │ poll CI    │           │ show status│
           │                  │ no auto    │           │ exit 0     │
     ┌─────┴─────┐            │ exit 0/1/2 │           └────────────┘
     │           │            └────────────┘
     ▼           ▼
┌─────────┐ ┌─────────┐
│ ALLOWED │ │ DENIED  │
│         │ │         │
│ APPLY   │ │ exit 2  │
│         │ │ hint:   │
│ add auto│ │ permis- │
│ poll CI │ │ sion    │
│ exit 0/2│ └─────────┘
└─────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                     MODE CAPABILITIES                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   mode       readonly    automerge    poll    permission                    │
│   ────       ────────    ─────────    ────    ──────────                    │
│   plan       yes         no           no      no                            │
│   watch      yes         no           yes     no                            │
│   apply      no          yes          yes     yes                           │
│   retry      no*         no           opt     no                            │
│                                                                              │
│   * retry triggers workflow rerun but doesn't enable automerge              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## exit code flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXIT CODES                                         │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────┐
                              │ outcome │
                              └────┬────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
 ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
 │   EXIT 0    │           │   EXIT 1    │           │   EXIT 2    │
 │   success   │           │ malfunction │           │ constraint  │
 ├─────────────┤           ├─────────────┤           ├─────────────┤
 │             │           │             │           │             │
 │ • merged    │           │ • gh error  │           │ • failed    │
 │ • passed    │           │ • network   │           │ • rebase    │
 │ • plan ok   │           │ • keyrack   │           │ • no PR     │
 │ • watch ok  │           │ • timeout*  │           │ • no perm   │
 │ • retry ok  │           │ • ambiguous │           │ • dirty     │
 │             │           │             │           │ • bad args  │
 └─────────────┘           └─────────────┘           └─────────────┘

 * timeout in test mode only
```

## dirty worktree check (apply only)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DIRTY WORKTREE CHECK                                    │
│                      (--mode apply only)                                     │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────┐
                              │ --mode  │
                              │  apply  │
                              └────┬────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │  check git     │
                          │  status        │
                          └───────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
             ┌───────────┐ ┌───────────┐ ┌───────────┐
             │   CLEAN   │ │   DIRTY   │ │   DIRTY   │
             │           │ │           │ │  + allow  │
             │ proceed   │ │ exit 2    │ │           │
             │           │ │ hint:     │ │ proceed   │
             │           │ │ stash or  │ │           │
             │           │ │ --dirty   │ │           │
             │           │ │ allow     │ │           │
             └───────────┘ └───────────┘ └───────────┘

note: plan and --watch skip this check (read-only modes)
```

## merged PR fallback

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MERGED PR FALLBACK                                      │
│                      (feature branch only)                                   │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌────────────────┐
                          │  lookup PR     │
                          │  (open PRs)    │
                          └───────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
             ┌───────────┐               ┌───────────┐
             │   FOUND   │               │ NOT FOUND │
             │           │               │           │
             │ continue  │               │ search    │
             │ with PR   │               │ merged    │
             └───────────┘               └─────┬─────┘
                                               │
                                               ▼
                                        ┌────────────────┐
                                        │  lookup PR     │
                                        │  (merged PRs)  │
                                        └───────┬────────┘
                                                │
                                  ┌─────────────┴─────────────┐
                                  │                           │
                                  ▼                           ▼
                           ┌───────────┐               ┌───────────┐
                           │   FOUND   │               │ NOT FOUND │
                           │           │               │           │
                           │ show as   │               │ crickets  │
                           │ MERGED    │               │ exit 2    │
                           │ exit 0    │               │ hint push │
                           └───────────┘               └───────────┘
```

## mixed check states

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MIXED CHECK STATES                                      │
│                      (failures + inflight)                                   │
└─────────────────────────────────────────────────────────────────────────────┘

   failed    inflight    behavior                              exit
   ──────    ────────    ────────                              ────
   0         0           all passed, show success              0
   0         1+          show progress, continue poll          per mode
   1+        0           show failures only                    2
   1+        1+          show both failures AND progress       2

note: failures exit immediately (exit 2) even with inflight checks.
      user may want to fix failures while other checks complete.

output example (mixed state):

   ├─ ⚓ 1 check(s) failed
   │  ├─ 🔴 test-unit
   │  │     ├─ https://github.com/test/repo/actions/runs/123
   │  │     └─ failed after Xm Ys
   │  └─ 🟡 2 check(s) still in progress
```

## retry flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           --retry FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────┐
                              │ --retry │
                              └────┬────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │  check entity  │
                          │  status        │
                          └───────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
             ┌───────────┐ ┌───────────┐ ┌───────────┐
             │  FAILED   │ │ NOT FAIL  │ │  INFLIGHT │
             │           │ │           │ │           │
             │ rerun     │ │ no-op     │ │ no-op     │
             │ workflows │ │ show stat │ │ show stat │
             └─────┬─────┘ └───────────┘ └───────────┘
                   │
                   ▼
          ┌────────────────┐
          │  check mode    │
          └───────┬────────┘
                  │
     ┌────────────┼────────────┐
     │            │            │
     ▼            ▼            ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ (plan)  │ │ --watch │ │ apply   │
│         │ │         │ │         │
│ exit 0  │ │ poll    │ │ add auto│
│ hint:   │ │ until   │ │ poll    │
│ --watch │ │ done    │ │ until   │
└─────────┘ └─────────┘ │ done    │
                        └─────────┘

output shows: "rerun triggered" when workflows are rerun
```

## edge cases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE CASES                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  MULTIPLE RELEASE PRs (ambiguous state)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  when: gh pr list returns 2+ release PRs                                    │
│  exit: 1 (malfunction)                                                       │
│  message: "multiple release PRs found, expected at most one"                │
│                                                                              │
│  this is unexpected state — should never happen in normal flow              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  AUTOMERGE "CLEAN STATUS" RESPONSE                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  when: gh pr merge --auto returns "clean status"                            │
│  intent: PR is ready to merge immediately                                   │
│  behavior: poll for MERGED state (merge happens instantly)                  │
│                                                                              │
│  this is NOT an error — just means checks already passed                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  TEST MODE (GIT_RELEASE_TEST_MODE=true)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  when: env var set                                                          │
│  behavior: limits poll iterations to prevent infinite loops                 │
│  exit: 1 (timeout) when iteration limit reached                             │
│                                                                              │
│  used only in integration tests                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## vibes reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TURTLE VIBES                                       │
└─────────────────────────────────────────────────────────────────────────────┘

     STATE                    VIBE                 EMOJI
     ─────                    ────                 ─────

     plan success             heres the wave...    🐢
     watch success            heres the wave...    🐢
     apply success (main)     cowabunga!           🐢
     apply success (prod)     radical!             🐢

     blocked/constraint       hold up dude...      🐢
     failure                  bummer dude...       🐢
     no PR found              crickets...          🐢

     progress                 lets see...          🐢
     await                    wait for it...       🫧


┌─────────────────────────────────────────────────────────────────────────────┐
│                        STATUS INDICATORS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   👌  all checks passed                                                      │
│   🐢  N check(s) in progress                                                │
│   ⚓  N check(s) failed                                                      │
│   🌴  automerge status                                                       │
│   🐚  shell/command or needs rebase                                         │
│   🥥  let's watch                                                            │
│   💤  poll/sleep                                                             │
│   ✨  done/success                                                           │
│   🔴  failed check detail                                                    │
│   🟡  in progress check detail                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
