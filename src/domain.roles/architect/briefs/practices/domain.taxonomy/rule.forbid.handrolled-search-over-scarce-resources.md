# rule.forbid.handrolled-search-over-scarce-resources

## .what

never hand-write a search over combinations of scarce resources — instructors × slots × boards, drivers × routes, rooms × shifts. that is operations research (`define.software-domain-taxonomy`). nested loops that try combinations blow up on a real roster and miss the best answer.

## .the smell

- nested loops over two or more resource sets
- a greedy "first fit" pass with retries
- a comment like "try the next instructor if this one is full"

```ts
// 👎 first fit: fast on ten instructors, wrong on two hundred
for (const instructor of instructors)
  for (const slot of slots)
    if (isFree({ instructor, slot })) return { instructor, slot };
```

## .the cure

declare the formulation — variables, constraints, objective — and hand it to a solver (linear, integer, constraint). the formulation reads as the domain's rules; the solver finds the answer.

## .enforcement

- hand-written search over combinations of scarce resources = **blocker**

## .see also

- `define.software-domain-taxonomy` — transactional vs analytical vs operations research
