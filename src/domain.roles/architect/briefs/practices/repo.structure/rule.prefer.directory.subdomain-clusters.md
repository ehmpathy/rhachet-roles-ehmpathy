# rule.prefer.directory.subdomain-clusters

## .what

prefer to categorize files into **subdomain directories** over large flat directories. cluster related operations by their **sub-noun** (the domain subject) so a reader lands on one place and sees the whole subdomain at once — extant files plus new ones.

this is the *prefer*-level, proactive counterpart to `rule.require.directory.by-primary-noun` (the deterministic placement algorithm). where that rule decides *which* directory a single file lands in, this rule pushes you to *proactively sort* a dir into subdomain clusters before it sprawls flat.

the two are a pair: `by-primary-noun` places each file deterministically; `subdomain-clusters` proactively shapes the tree those placements land in.

## .why

- large flat dirs are a visual smell — a flat dir of ~40 loose ops hides the structure of knowledge
- brains (human + robot) interpret treestructs more clearly than flat lists
- structural groups let a reader decipher patterns and information from the hierarchy itself
- a subdomain tree surfaces the domain's shape at a glance
- discoverability: files grouped by domain, not by type
- autocomplete: shared noun-stack prefixes enable tree-sorted navigation

## .the three moves — decompose, categorize, leaf

file organization is three composed moves:

1. **decompose** into subdomains — factor the domain into its subject nouns (`customer/`, `invoice/`), then sub-subjects (`invoice/lifecycle/`, `lifecycle/draft/`)
2. **categorize** by sub-noun, not by verb — the directory is the noun; the verb stays in the filename (`[verb][...noun]` treestruct). pairs with `rule.require.group-by-noun-not-verb`
3. **leaf** at the most-common-denominator — operations start at their most-specific leaf and lift only on proven reuse. pairs with `rule.prefer.most-common-denominator`

## .kernel — categorization is proactive, not only reactive

`rule.prefer.most-common-denominator` governs *placement*: how far out to nest an op, and when to lift it on reuse — a **reactive** move.

this rule governs *categorization*: proactively sort operations into subdomain dirs to avoid flat-dir sprawl, rather than nest reactively only when reuse forces it. prefer subdomain categories **wherever possible**.

## .kernel — cluster by sub-noun, keep the noun-stack

- cluster by sub-noun, never by verb
- keep the verb in the filename (`[verb][...noun]`)
- extend the noun stack in op names so a family autocompletes together (e.g. `getAllRouteGuardReviewPeer*`)
- push ops to the most-common-denominator level; **do not force a leaf util into an artificial bucket when it shares no domain noun** — a util with no shared noun stays at the parent root

## .the pattern

subdomain decomposition, nested by sub-noun:

```
src/domain.operations/
├── customer/           # domain
│   ├── phone/          # subdomain
│   │   └── setCustomerPhone.ts
│   └── email/          # subdomain
│       └── setCustomerEmail.ts
└── invoice/            # domain
    ├── lifecycle/      # subdomain
    │   ├── draft/      # sub-subdomain
    │   │   └── genInvoiceDraft.ts
    │   └── charge/
    │       └── reqInvoiceCharge.ts
    └── getInvoice.ts
```

## .examples

### 👎 negative — flat sprawl

```
src/domain.operations/
  getS3Object.ts
  setS3Object.ts
  deleteS3Object.ts
  asS3Ref.ts
  asS3ConditionError.ts
  asS3ConditionHeaders.ts
  asGetOneOutput.ts
  asSetOutput.ts
  ... (many more)
```

### 👍 positive — sorted subdomains

```
src/domain.operations/
  object/
    getS3Object.ts
    setS3Object.ts
    deleteS3Object.ts
  condition/
    asS3ConditionError.ts
    asS3ConditionHeaders.ts
  ref/
    asS3Ref.ts
```

### 👍 positive — cluster with leaf utils at root

from a real reorganization: `guard/` was a flat ~40-file namespace whose only cluster was `reviewPeerMeter/`. reorganized by sub-noun:

```
guard/
├── review/
│   ├── peer/
│   │   └── meter/
│   └── self/
├── tree/
├── stamp/
├── judge/
├── artifact/
└── (leaf utils with no shared noun stay at guard/ root)
```

## .scope

applies to:
- `src/domain.operations/`
- `src/domain.objects/`
- `.agent/repo=*/role=*/`

## .enforcement

- a flat dir that would read more clearly as sorted subdomains = **nitpick** (prefer)
- a leaf util force-nested into a bucket it shares no noun with = **nitpick**

## .see also

- `rule.require.directory.by-primary-noun` — the deterministic per-file placement algorithm (require-level counterpart)
- `rule.require.group-by-noun-not-verb` — the directory is a noun, never a verb
- `rule.prefer.most-common-denominator` — nest at the most-specific place; lift on reuse
- `rule.require.treestruct` — the `[verb][...noun]` filename grammar
