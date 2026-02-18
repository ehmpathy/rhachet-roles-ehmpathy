# kernelize: kernel-aware compression prep

## definition

**kernelize** = extract and preserve critical concept kernels in compression.

## rule

before you compress, identify the critical concepts (kernels) that MUST survive compression.

## method

1. **extract kernels** — identify each distinct, atomic concept in the source
2. **tag as critical** — mark kernels that are decision-critical for the reader
3. **preserve verbatim** — these kernels must appear in the compressed output
4. **allow rephrase** — non-critical content can be condensed, merged, or cut

## kernel types

| type | description | preserve? |
|------|-------------|-----------|
| rule | explicit constraint or requirement | always |
| definition | term or concept definition | always |
| pattern | reusable code or design pattern | always |
| example | illustration of a concept | keep 1, cut rest |
| rationale | explanation of why | condense |
| context | background info | cut if redundant |

## output format

when you compress via kernelize:

1. first, list the kernels you identified (as internal notes)
2. then, produce the compressed output that preserves all critical kernels
3. verify each critical kernel appears in the output

## example

source:
```
always use const instead of let.
this prevents accidental reassignment.
for example, const x = 5 cannot be changed.
another example: const arr = [] can still be mutated but not reassigned.
```

kernels identified:
- k1: "use const instead of let" (rule, critical)
- k2: "prevents accidental reassignment" (rationale, condense)
- k3: example 1 (example, keep one)
- k4: example 2 (example, cut)

compressed:
```
use const not let — prevents reassignment. e.g., const x = 5 is immutable.
```

## integration

kernelize is designed as a first pass before sitrep or tsc:
- `[[kernelize], [sitrep-aggressive], [tsc]]` — identify kernels, compress semantically, then tighten grammar
