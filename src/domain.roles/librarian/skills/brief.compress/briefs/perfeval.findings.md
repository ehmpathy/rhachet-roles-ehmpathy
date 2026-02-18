# perfeval findings: methodology brief comparison

## summary

evaluated 8 single-call combinations + 1 chained pipeline for bhrain/sitrep compression across 5 representative briefs with 3 runs each (135 total compressions).

**winner: `[[sitrep-aggressive], [tsc]]` (chained) at 3.01x mean compression**

## results

### single-call combinations

| combination             | mean    | min   | max   | stddev |
| ----------------------- | ------- | ----- | ----- | ------ |
| [sitrep-aggressive]     | 2.49x   | 1.26x | 4.30x | 0.83   |
| [sitrep-iterative]      | 2.22x   | 1.24x | 3.93x | 0.84   |
| [sitrep-aggressive, tsc]| 2.19x   | 1.13x | 4.13x | 0.85   |
| [sitrep-taskaware]      | 1.94x   | 1.17x | 2.96x | 0.53   |
| [sitrep]                | 1.65x   | 1.08x | 2.48x | 0.32   |
| [tsc, sitrep]           | 1.60x   | 1.25x | 2.11x | 0.29   |
| [sitrep, tsc, sitrep]   | 1.57x   | 1.17x | 2.21x | 0.31   |
| [sitrep, tsc]           | 1.37x   | 1.05x | 1.72x | 0.17   |

### chained pipeline

| pipeline                       | mean      | min   | max   | stddev |
| ------------------------------ | --------- | ----- | ----- | ------ |
| **[[sitrep-aggressive], [tsc]]** | **3.01x** | 1.59x | 7.50x | 1.56   |

pass-by-pass:
- pass 1 (sitrep-aggressive): 2.65x mean (1.38x - 6.19x)
- pass 2 (tsc cleanup): 1.13x mean (1.03x - 1.22x)

## key findings

### chained beats single-call

- chained 3.01x > single-call best 2.49x (+21%)
- sequential passes let each methodology fully apply
- total = pass1 × pass2 (2.65 × 1.13 ≈ 3.0)

### explicit targets win

- sitrep-aggressive uses "≤25% of original" explicit target
- achieves 2.49x vs baseline sitrep's 1.65x (51% improvement)

### tsc better as cleanup

- tsc underperforms as primary compressor
- but adds 1.13x as second pass on compressed content
- extractive (tsc) synergizes with abstractive (sitrep) when sequenced

### variance analysis

| compression level | combinations | stddev range | interpretation |
|-------------------|--------------|--------------|----------------|
| high (>2x)        | aggressive, iterative | 0.83-1.56 | high variance — best-of-N valuable |
| medium (1.5-2x)   | taskaware, sitrep | 0.32-0.53 | moderate variance |
| low (<1.5x)       | tsc combos | 0.17-0.31 | low variance — consistent but weak |

**implication:** for aggressive compression, run 3x in parallel and select best.

## recommendation

**production default**: `[[sitrep-aggressive], [tsc]]`
- best mean compression (3.01x)
- two-pass: abstractive first, extractive cleanup second
- 12s avg per compression

**single-call alternative**: `[sitrep-aggressive]`
- 2.49x in single call
- ~3x faster (2.5s vs 12s)

**consistency-critical**: `[sitrep-taskaware]`
- moderate compression (1.94x) with lower variance (0.53)
- predictable results

## run command

```sh
npm run test:integration:non-cicd -- compress.via.bhrain.perfeval
```
