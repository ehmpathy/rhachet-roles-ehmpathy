# F2: which refusals name the director grant

## .the fork
- A: only "no commit uses left"
- B: also "push not allowed" and "no commit quota set", since one director grant fixes all three

## .taken
B, by the director's verdict. the driver's best guess was A.

## .the case against A
C14: when uses = 0 and push is blocked at once, rebase checks push first
(`git.branch.rebase.begin.sh:87`) and shows "ask your human to grant permission". under A, a driver
in that state still halts on a human.

## .rework
clean: one render helper serves all three refusals; no ripple beyond the refusal sites and their
snapshots.

## .risk
medium. more surfaces change: rebase (3 refusals), git.commit.set (3), git.commit.push (push refusal,
tree and json output modes), git.release (2). each needs a director variant and a clamp. the push
refusal's fix must carry `--push allow` in the printed grant, or the director's one call leaves push
blocked.

## .where
`1.vision.yield.md` scope + open question 3; inventory C3, C4, C14.

## .verdict
director, 2026-10-30: B. widen to "push not allowed" and "no commit quota set", on git.commit.set and
git.commit.push too; same harm, same cure.
