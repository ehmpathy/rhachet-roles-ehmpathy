# stability metrics: ARI and Jaccard

## the strategy: kernelize → cluster → synonyms

**kernelize + cluster = ConceptKernelClusters with synonyms**

the pipeline:

1. **kernelize** — extract atomic concepts from a brief via N parallel runs
2. **cluster** — group semantically equivalent kernels via brain-driven similarity
3. **output** — `ConsensusKernel` with variants (synonyms) for each distinct concept

why synonyms matter:
- each run phrases the same concept differently
- "use input-context pattern" ≈ "all procs take (input, context)" ≈ "require input-context args"
- downstream consumers (compressor, retention checker) benefit from **multiple phrasings**
- more synonyms = narrower, more precise kernel identity

## the core insight

**ARI gives us a deterministic measure of cluster stability.**

without ARI, we can't answer: "how reliable is this consensus?" with ARI, we get a number: 0.92 = very stable, 0.45 = shaky.

this determinism enables trust. if stability is high, the consensus kernels are trustworthy. if stability is low, the extraction is unreliable and results should be treated with caution.

## what is ARI?

**Adjusted Rand Index (ARI)** measures similarity between two cluster assignments.

given N items assigned to clusters, ARI asks: "do both runs agree on which items belong together?"

| score | definition |
|-------|------------|
| 1.0 | identical structure — same items grouped together |
| 0.0 | random — no better than chance |
| < 0 | worse than random — actively disagreed |

### the label problem

cluster labels are arbitrary. run A might call a group "cluster 1" while run B calls the same group "cluster 3". naive comparison fails:

```
run A: {k1, k2} → cluster 1,  {k3, k4} → cluster 2
run B: {k1, k2} → cluster 3,  {k3, k4} → cluster 1

label match: 0% (no labels match)
ARI: 1.0 (identical structure — same pairs grouped together)
```

ARI is **label-invariant** — it measures structural agreement, not label agreement.

### pairwise agreement math

ARI counts **pairs** of items:

| pair type | definition |
|-----------|------------|
| a11 | same cluster in both runs |
| a00 | different cluster in both runs |
| a10 | same in A, different in B |
| a01 | different in A, same in B |

**agreement** = a11 + a00 (both runs agree on this pair)
**disagreement** = a10 + a01 (runs disagree)

ARI = (observed agreement - expected) / (max possible - expected)

the "adjusted" corrects for chance — random assignments score 0, not some positive baseline.

## how consensus kernel selection works

when you run `--consensus N`, the system:

1. **runs N parallel extractions** — each produces a set of kernels
2. **pools all kernels** — prefixed with run index (r0_k1, r1_k1, etc.)
3. **clusters via brain** — semantic similarity groups equivalent concepts
4. **counts coverage** — for each cluster, count unique runs represented
5. **filters by threshold** — keep clusters where coverage >= threshold × N
6. **selects representative** — pick one kernel from each surviving cluster

### example: 3 runs, threshold 0.5 (majority)

```
run 0: [k1: "use input-context pattern", k2: "arrow functions only"]
run 1: [k1: "all procs take (input, context)", k2: "no function keyword"]
run 2: [k1: "require input-context args", k2: "arrow syntax required"]
```

after brain cluster:
```
cluster A: [r0_k1, r1_k1, r2_k1] — all 3 runs (keep ✓)
cluster B: [r0_k2, r1_k2, r2_k2] — all 3 runs (keep ✓)
```

result: 2 consensus kernels, each backed by all 3 runs.

### selecting which kernels pass down

the current approach:

```
keep if: (# unique runs in cluster) >= ceil(threshold × total_runs)
```

for threshold=0.5 with 3 runs: keep if cluster spans >= 2 runs.

this is **majority voting** — kernels that appear in most extractions are real concepts; kernels that appear in only one extraction are noise.

## ConsensusKernel: variants as synonyms

consensus mode returns `ConsensusKernel` with full cluster membership:

```json
{
  "kernels": [
    {
      "id": "k1",
      "concept": "use input-context pattern",
      "category": "rule",
      "variants": [
        { "run": 0, "concept": "use input-context pattern" },
        { "run": 1, "concept": "all procs take (input, context)" },
        { "run": 2, "concept": "require input-context args" }
      ],
      "coverage": 3
    }
  ]
}
```

this provides:
- **representative** — the concept chosen by brain from the cluster
- **variants** — all expressions from each run (synonyms)
- **coverage** — how many runs extracted this concept

### why variants help downstream

the compressor can use variants to:
- check if **any** expression of the kernel is present in compressed output
- understand the kernel more precisely via multiple angles
- reduce false negatives in retention checks (concept preserved but rephrased)

the more synonyms per kernel cluster, the better the downstream consumer can identify the concept

## choosing the most stable cluster set

when stability varies, you might want to identify which extraction is "most central" — the one most similar to all others.

approach: compute pairwise ARI for all runs, sum each run's scores:

```
run 0: ARI(0,1) + ARI(0,2) = 0.8 + 0.9 = 1.7
run 1: ARI(1,0) + ARI(1,2) = 0.8 + 0.7 = 1.5
run 2: ARI(2,0) + ARI(2,1) = 0.9 + 0.7 = 1.6
```

run 0 is most central — highest total agreement with other runs.

this could be used to:
- weight the representative selection
- flag outlier extractions
- provide confidence intervals on kernel counts

## metrics in kernelize

### consensus extraction (Jaccard)

for kernel extraction stability, we measure **set overlap** via Jaccard:

```
Jaccard = |intersection| / |union|
```

each run produces a set of cluster IDs. Jaccard measures: "what fraction of clusters appear in both runs?"

reported as `consensus.stability.meanJaccard` in output.

### cluster perfeval (ARI)

for the dedicated cluster skill, we use ARI because:

- same kernel IDs across runs (same input)
- only cluster assignments differ
- ARI directly measures assignment agreement

## summary: why this matters

| metric | question answered |
|--------|-------------------|
| **stability** | "can we trust this consensus?" |
| **coverage** | "how many runs agreed on this kernel?" |
| **variants** | "what were the different expressions?" |
| **centrality** | "which run was most typical?" |

high stability + high coverage = reliable kernel extraction.
low stability = treat results with caution, maybe increase N.

## reference

- [wikipedia: rand index](https://en.wikipedia.org/wiki/Rand_index)
- [scikit-learn: adjusted rand score](https://scikit-learn.org/stable/modules/clustering.html#adjusted-rand-index)
