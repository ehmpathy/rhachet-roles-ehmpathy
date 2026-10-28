# F18 — waiters poll for a free slot, with no queue

- **fork:** a ticket queue (first come, first served) · each waiter polls every 1s, and the kernel
  `flock -n` decides who claims a freed slot
- **taken:** the poll. a queue is a second source of truth beside the locks, and it must survive a
  waiter that dies mid-queue, which the lock does by construction (F2). at today's load (2 slots
  on a 12-core grove, a handful of trees) a freed slot goes to one of a few waiters within a
  second; the two-waiter race is clamped (`[case2] [t4]`: both claim, never two at once)
- **accepted cost:** under steady crew load a long waiter can lose the race again and again; a
  fresh arrival may claim before it. the heartbeat names the holders, not the other waiters
- **also accepted:** an unscoped, non-thorough run waits for a slot before jest learns that
  `--changedSince` matches no test; it then exits 0 with naught run. the list cannot be known
  without a jest call, and a pre-claim `--listTests --changedSince` would add a jest boot to
  every run
- **also accepted:** a `--what all` run claims a slot per child and frees it at the child's exit,
  so on a busy grove each child waits anew, and a polled waiter may take the slot before the next
  child arrives. a parent-held slot passed down would change the unit of the bound (one flock per
  suite) and hold a slot through lint and types; named in the brief as a cost
- **rework:** clean — a queue file per slot plus a fairness check in the poll
- **dream:** the queue shape is noted in
  `dreams/v2026_10_26.refactor.git-repo-test-child-operations-split.md`
- **confidence:** 80%
- **raised by:** peer i005 — enroll-impl-behavior-intent nitpicks on fairness and the no-op wait;
  enroll-impl-arch-defects point 6; peer i006 — enroll-impl-behavior-intent nitpick on the
  `--what all` re-queue, enroll-impl-arch-defects nitpick on `/tmp` record growth
- **verdict:** awaited
