# recommended compression pipelines

## GOOD density (2-3x compression)

readable, stable, production-ready compression.

### 1. `[[req-kernels, telegraphic]]` — **default**

| metric | value |
|--------|-------|
| compress | **2.8x** |
| kern.σ | **0.28** |
| use case | general use |

- injects extracted kernels into prompt for retention awareness
- sweet spot: readable output with measurable kernel preservation
- **recommended as default for all briefs**

### 2. `[[telegraphic]], ver:[restore]` — lossless recovery

| metric | value |
|--------|-------|
| compress | **2.3x** |
| kern.σ | **0.20** |
| use case | lossless recovery |

- restore pass recovers any lost kernels from source
- lower compression but guaranteed retention
- use for critical rules and references

### 3. `[[telegraphic]]` — simple

| metric | value |
|--------|-------|
| compress | **3.3x** |
| kern.σ | **0.33** |
| use case | quick compress |

- single-step telegraphic compression
- slightly higher kernel variance
- use for quick iteration on drafts

---

## EXTREME density (6-18x compression)

aggressive compression for context-critical scenarios.

### 4. `[[sitrep-aggressive], [telegraphic]]` — max compression

| metric | value |
|--------|-------|
| compress | **6-18x** |
| kern.σ | **variable** |
| use case | max compression |

- sitrep-aggressive for deep distillation
- telegraphic polish for final density
- **high variance** — verify output manually

### 5. `[[req-kernels, sitrep-aggressive], [telegraphic]]` — max + kernel-aware

| metric | value |
|--------|-------|
| compress | **6-18x** |
| kern.σ | **~0** |
| use case | max compression with kernel retention |

- kernel injection prevents concept loss
- highest density with retention guarantee
- use for long reference docs

---

## quick reference

| density | pipeline | compress | kern.σ | use case |
|---------|----------|----------|--------|----------|
| **GOOD (default)** | `[[req-kernels, telegraphic]]` | 2.8x | 0.28 | general use |
| GOOD + restore | `[[telegraphic]], ver:[restore]` | 2.3x | 0.20 | lossless recovery |
| GOOD (simple) | `[[telegraphic]]` | 3.3x | 0.33 | quick compress |
| EXTREME | `[[sitrep-aggressive], [telegraphic]]` | 6-18x | var | max compression |
| EXTREME + lossless | `[[req-kernels, sitrep-aggressive], [telegraphic]]` | 6-18x | ~0 | max + kernel-aware |

---

## pipeline anatomy

```
sup:[supply], [[step1], [step2], ...], ver:[verify]
│              │                        │
│              │                        └── ver:[operation]: e.g., ver:[restore]
│              │
│              └── press steps (applied sequentially)
│                  - each [] is a step
│                  - briefs within [] are applied together
│
└── sup:[operation]: e.g., sup:[kernelize]
```

### step briefs

| brief | effect |
|-------|--------|
| `telegraphic` | telegraphic semantic compression |
| `sitrep-aggressive` | aggressive compression target |
| `req-kernels` | inject extracted kernels into prompt |
| `sitrep-taskaware` | optimized for agent context consumption |
| `sitrep-iterative` | two-pass internal refinement |

### supply operations

| operation | effect |
|-----------|--------|
| `kernelize` | extract concept kernels before compression |

### verify operations

| operation | effect |
|-----------|--------|
| `restore` | if kernels lost, restore from source |
| `degerund` | remove gerunds (-ing words), always on by default |

---

## selection guide

| goal | recommended pipeline |
|------|---------------------|
| default (balanced) | #1 `[[req-kernels, telegraphic]]` |
| zero kernel loss | #2 `[[telegraphic]], ver:[restore]` |
| fast iteration | #3 `[[telegraphic]]` |
| max compression | #4 `[[sitrep-aggressive], [telegraphic]]` |
| max + lossless | #5 `[[req-kernels, sitrep-aggressive], [telegraphic]]` |

---

## source

perfeval: validated 2026-02-17
brain: `xai/grok/3-mini`
