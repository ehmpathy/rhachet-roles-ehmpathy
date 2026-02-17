# recommended compression pipelines

## selection criteria

- **kern.Δ > -1** — less than 1 kernel lost on average
- **maximize dens.Δ** — highest density improvement
- **stability** — low σ (standard deviation) required

---

## top 5 recommended

### 1. `sup:[kernelize], [[req-kernels, sitrep-aggressive], [telegraphic]]`

**best balance: high density + stable**

| metric | value |
|--------|-------|
| dens.Δ | **+5.1** |
| dens.σ | **1.9** |
| kern.Δ | -0.3 |
| tok.Δ | -1282 |

- `req-kernels` brief injects extracted kernels into prompt
- forces retention via explicit kernel awareness
- **lowest variance** of high-density pipelines

### 2. `sup:[kernelize], [[req-kernels, sitrep-aggressive], [req-kernels, sitrep-taskaware], [req-kernels, telegraphic]]`

**lossless + stable**

| metric | value |
|--------|-------|
| dens.Δ | **+4.3** |
| dens.σ | **2.7** |
| kern.Δ | **+0.0** |
| kern.σ | **0.0** |
| tok.Δ | -1311 |

- **zero kernel loss** across all test briefs
- **zero variance on kernel retention**
- three-step with kernel injection at each step

### 3. `sup:[kernelize], [[sitrep-iterative], [telegraphic]]`

**lossless + simple**

| metric | value |
|--------|-------|
| dens.Δ | **+3.8** |
| dens.σ | **3.3** |
| kern.Δ | **+0.0** |
| kern.σ | **0.0** |
| tok.Δ | -1309 |

- **zero kernel loss**
- simpler two-step pipeline
- lower latency than three-step options

### 4. `sup:[kernelize], [[sitrep-iterative], [telegraphic], [telegraphic]]`

**iterative refinement**

| metric | value |
|--------|-------|
| dens.Δ | **+5.0** |
| dens.σ | 7.1 |
| kern.Δ | -0.5 |
| tok.Δ | -1000 |

- sitrep-iterative does two-pass internal refinement
- double telegraphic polish for maximum density
- **moderate variance** — acceptable for drafts

### 5. `sup:[kernelize], [[sitrep-aggressive], [telegraphic]], ver:[restore]`

**max compression (high variance)**

| metric | value |
|--------|-------|
| dens.Δ | **+8.8** |
| dens.σ | **14.0** |
| kern.Δ | -0.4 |
| tok.Δ | -1016 |

- highest density gain, but **high variance**
- `restore` post-pass recovers any lost kernels
- **use only when variance is acceptable**

---

## quick reference

| pipeline | dens.Δ | dens.σ | kern.Δ | use case |
|----------|--------|--------|--------|----------|
| `sup:[kernelize], [[req-kernels, sitrep-aggressive], [telegraphic]]` | +5.1 | 1.9 | -0.3 | **default choice** |
| `sup:[kernelize], [[req-kernels, sitrep-aggressive], [req-kernels, sitrep-taskaware], [req-kernels, telegraphic]]` | +4.3 | 2.7 | 0.0 | lossless (stable) |
| `sup:[kernelize], [[sitrep-iterative], [telegraphic]]` | +3.8 | 3.3 | 0.0 | lossless (simple) |
| `sup:[kernelize], [[sitrep-iterative], [telegraphic], [telegraphic]]` | +5.0 | 7.1 | -0.5 | iterative (drafts) |
| `sup:[kernelize], [[sitrep-aggressive], [telegraphic]], ver:[restore]` | +8.8 | 14.0 | -0.4 | max compression (variance ok) |

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
| `sitrep` | situation report compression (baseline) |
| `sitrep-aggressive` | aggressive compression target |
| `sitrep-iterative` | two-pass internal refinement |
| `sitrep-taskaware` | optimized for agent context consumption |
| `telegraphic` | telegraphic semantic compression |
| `req-kernels` | inject extracted kernels into prompt |

### supply operations

| operation | effect |
|-----------|--------|
| `kernelize` | extract concept kernels before compression |

### verify operations

| operation | effect |
|-----------|--------|
| `restore` | if kernels lost, restore from source |

---

## selection guide

| goal | recommended pipeline |
|------|---------------------|
| default (balanced) | #1 (`req-kernels`, dens.σ = 1.9) |
| zero kernel loss | #2 or #3 (`lossless`) |
| fast iteration | #3 (simpler pipeline) |
| drafts (variance ok) | #4 (`iterative`) |
| max compression (variance ok) | #5 (`restore`) |

---

## source

perfeval: `.perfevals/2026-02-16.1.evals.md`
brain: `xai/grok/code-fast-1`
briefs tested: 8
runs per combination: 3
