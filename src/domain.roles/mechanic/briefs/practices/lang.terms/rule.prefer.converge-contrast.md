# rule.prefer.converge-contrast

## .what

when you weigh sources against a claim — citations, prior art, reviews, test results, peer repos — sort each one as **converge** or **contrast**:

- `converge` — the source reaches the same claim by its own path
- `contrast` — the source sets a different view beside the claim, for the reader to weigh

## .why

- **neither word issues a verdict.** a contrast source is not wrong, and a converge source is not proof. the reader weighs both
- **the rival pairs overclaim or overload:**
  - `agree` / `disagree` casts a source as a person who votes
  - `support` / `refute` claims proof the source rarely holds
  - `converge` / `diverge` — `diverge` implies two paths that split from one origin, and it collides with git branches and math series
- **the pair is symmetric**: one prefix (`con-`), one length (8 / 8) (`rule.prefer.symmetric-term-pairs`, architect)

## .how

each row names what makes it count:

| verdict | the row must name |
|---|---|
| converge | the independent path — another author, era, or method. one source cited twice is one source, not convergence |
| contrast | the point it contrasts on, and what the claim does with it: **narrow** the claim, **bound** it, or **rebut** the source |

a contrast row with no response leaves the claim exposed. answer it, or narrow the claim until the contrast no longer bites.

## .examples

### 👍 good

| source | stance | on which point | response |
|---|---|---|---|
| meyer 1992 | converge | a contract decides fault: caller vs supplier | — |
| naur 1985 | contrast | the theory of a program lives in its programmers' heads and cannot be fully written down | **rebut**: the theory is declared iteratively — each discovered invariant lights more of the domain |

### 👎 bad

| source | stance |
|---|---|
| naur 1985 | disagrees |

reads as a vote, names no point, and leaves the claim unanswered.

## .scope

research notes, ref inventories, citation tables in briefs, comparisons of approaches in plans and pr descriptions, review syntheses.

does not force the pair onto data that truly converges or diverges over time — a numeric series, a branch history.

## .enforcement

- agree/disagree, support/refute, or converge/diverge where converge/contrast fits = **nitpick**
- a contrast row with no point or no response = **nitpick**
- a converge row whose source is not independent of another counted row = **nitpick**

## .etymology

- **converge**, latin *con-* (together) + *vergere* (to incline): lines that bend toward one point. independent sources that arrive at one claim are lines that meet; their independence gives the meet its weight
- **contrast**, latin *contra-* (against) + *stare* (to stand): to stand against, set beside. a contrast source stands beside the claim with a different view. it issues no verdict, and implies no shared origin

## .evidence

### the dimensional walk

| axis | values |
|---|---|
| does the pair issue a verdict? | no (converge/contrast) · yes (support/refute, confirm/contradict) |
| does it cast the source as a person? | no (converge/contrast) · yes (agree/disagree) |
| does it imply a shared origin? | no (contrast) · yes (diverge) |
| does a term collide with an extant sense? | no · yes (diverge: git branches, math series; conflict: merge conflicts) |
| symmetric shape and length? | yes, 8 / 8 (converge/contrast) · no (support/refute 7/6; agree/disagree 5/8) |

the only candidate with the clean value on every axis: **converge / contrast**.

### precedent

- *compare and contrast* — the common english pair for two views set side by side, with no verdict

## .rejected alternatives

| pair | why rejected |
|---|---|
| agree / disagree | casts the source as a voter; implies a verdict; length 5 / 8 |
| support / refute | claims proof; *refute* means disproved, too strong for a different view |
| converge / diverge | *diverge* implies a split from one origin; collides with git branches and math series |
| confirm / contradict | *confirm* overclaims; *contradict* is a logical opposite, too strong |
| align / conflict | *conflict* implies a clash that must be settled; collides with merge conflicts |
| for / against | reads as a debate tally; no room for a partial stance |

## .see also

- `rule.require.ubiqlang` — one canonical word per concept
- `rule.prefer.symmetric-term-pairs` (architect) — the shape this pair holds
- `rule.prefer.expected-detected` (architect) — a peer pair, for desired vs observed
