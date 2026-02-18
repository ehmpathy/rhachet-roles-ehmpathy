# concept reframe for compressibility

## observation

abstract concepts have low kernel extraction stability (34-50% full coverage) because:
- same idea expressed in multiple phrasings
- fuzzy boundaries between related concepts
- brain extracts different "cuts" each run

## insight

concepts can be **reframed** to maximize compressibility without semantic loss.

## the kernelization test

**rule**: if `kernelize` cannot extract consistent kernels from content, no downstream compressor will retain them consistently either.

kernelization stability predicts compression quality:

| kernelize stability | compression outcome |
|---------------------|---------------------|
| >80% full coverage | high-quality compression possible |
| 60-80% full coverage | moderate compression, some drift |
| <60% full coverage | unstable compression, significant semantic variance |

**how to test**:
```sh
# run kernelize 5 times, check cluster stability
npx rhachet run --skill kernelize --from my-brief.md --consensus 5

# if full coverage < 60%, reframe before compress
```

**why this works**: kernelization is the atomic step of compression. if the atoms themselves are unstable (brain extracts different concepts each run), any compression built on them inherits that instability. stable kernels → stable compression → reliable semantic retention.

## reframe strategies

### 1. crystallize to rules

transform fuzzy concepts into concrete prescriptions:

**before** (concept):
> dependency injection promotes testability and flexibility by external dependency pass rather than internal construction

**after** (rule):
> always pass dependencies via `context` argument
> never construct dependencies inside procedures

### 2. enumerate over explain

replace explanatory prose with explicit lists:

**before**:
> the pattern helps with tests because you can swap real dependencies for mocks, and it helps with flexibility because implementations can change without core logic modification

**after**:
> benefits:
> - swap dependencies for test mocks
> - change implementations without core logic changes

### 3. name the atoms

give explicit names to recurrent concepts:

**before**:
> when you find yourself about to use a gerund, pause and think about what precise term captures the concept

**after**:
> **termsmell**: gerund → signals domain not yet clarified
> **fix**: replace with noun, verb, or past participle

### 4. canonicalize phrasings

choose one phrase, use it consistently:

**before**:
> - dependency injection via context
> - pass dependencies through context argument
> - inject deps via context pattern
> - context-based dependency provision

**after**:
> - dependency injection via context

(eliminate synonymous phrases that create extraction variance)

### 5. separate examples from rules

rules compress well; examples are optional context:

**structure**:
```
## rule
<the prescription, no examples>

## examples
<concrete illustrations, can be dropped in aggressive compression>
```

## when to reframe

- before compress of high-value briefs
- when kernelize reports <60% stability
- when content will be read by agents (not humans)
- when compression ratio matters more than prose flow

## tradeoff

reframe sacrifices prose readability for compression efficiency. human-faced docs may prefer natural language; agent-faced briefs benefit from crystallized rules.

## see also

- `content-type-aware.methodology.md` — content types need different compression
- `tsc.methodology.md` — telegraphic semantic compression
