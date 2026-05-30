# rule.prefer.most-common-denominator

## .what

push operations to the farthest outermost leaf possible. encapsulate complexity to only where its needed today.

when another domain reuses an operation, lift it to their common ancestor.

## .why

- flat structures pollute namespaces with task-specific operations
- nested structures co-locate related operations, improve discoverability
- lift should be reactive (proven reuse), not proactive (speculative reuse)

## .note: different from wet-over-dry

wet-over-dry is about **generalization** — when to abstract similar code into a shared operation.

most-common-denominator is about **placement** — where an already-decomposed operation should live.

an operation that is already reusable should start at its leaf. when a second domain needs it, lift immediately — no duplication.

## .pattern

| phase | action |
|-------|--------|
| create | nest at the most specific place |
| reuse | lift to the common ancestor immediately |

## .example: async task (svc-quotes)

from ahbode/svc-quotes — async tasks that ask providers for quotes:

```
src/logic/
└── askForQuotes/
    ├── enqueueTasksToAskForQuotes.ts                     # coordinates both async tasks
    │
    ├── asyncTaskAskMarketplaceForQuotes/
    │   ├── executeTaskAskMarketplaceForQuotes.ts
    │   ├── enqueueTaskAskMarketplaceForQuotes.ts
    │   ├── askNearbyLeadsSubscribersForQuotes.ts       # marketplace-specific
    │   ├── askPriorityAccessSubscribersForQuotes.ts    # marketplace-specific
    │   ├── askOnlineForumsForQuotes.ts                 # marketplace-specific
    │   └── getEligibleNearbyLeadSubscribersForJob.ts   # marketplace-specific
    │
    └── asyncTaskAskProviderForQuotes/
        ├── executeTaskAskProviderForQuotes.ts
        └── enqueueTaskAskProviderForQuotes.ts
```

each async task owns its operations:
- `getEligibleNearbyLeadSubscribersForJob` only used by marketplace task → stays nested
- `enqueueTasksToAskForQuotes` coordinates both tasks → lives at `askForQuotes/` level

## .example: domain lifecycle (svc-protools)

from ahbode/svc-protools — invoice lifecycle with nested stages:

```
src/logic/advertise/invoice/
├── getInvoice.ts                                       # top-level reads
├── getInvoices.ts
├── getInvoiceItem.ts
│
├── cron/
│   ├── cronDriveAllInvoicesToCollection.ts
│   ├── cronDriveDraftInvoicesToCollection.ts
│   └── cronDriveOverdueInvoicesToCollection.ts
│
└── lifecycle/
    ├── genInvoiceDraftByAccruedAt.ts                   # coordinates draft stage
    ├── reqInvoiceCharge.ts                             # lifecycle-level
    ├── reqInvoiceSend.ts
    ├── setInvoiceIssued.ts
    ├── setInvoiceGifted.ts
    │
    ├── draft/
    │   ├── genInvoiceDraft.ts                          # draft orchestrator
    │   ├── castProspectToInvoiceItemExid.ts            # draft-specific transformer
    │   ├── castToStripeInvoiceItem.ts                  # draft-specific transformer
    │   ├── getProspectsAsInvoiceItems.ts               # draft-specific
    │   ├── setInvoiceItems.ts                          # draft-specific
    │   ├── setProspectAsInvoiceItem.ts                 # draft-specific
    │   ├── syncInvoiceDraft.ts                         # draft-specific
    │   ├── syncInvoiceDraftFromSource.ts               # draft-specific
    │   └── syncInvoiceDraftToStripe.ts                 # draft-specific
    │
    └── adjust/
        └── adjustInvoiceItemPrice.ts                   # adjust-specific
```

draft-stage operations stay nested under `draft/`:
- `castToStripeInvoiceItem` only used by draft → stays in `draft/`
- `syncInvoiceDraftToStripe` only used by draft → stays in `draft/`
- `reqInvoiceCharge` used across stages → lives at `lifecycle/` level

### anti-pattern: flat namespace

```
src/logic/
├── genInvoiceDraft.ts
├── castProspectToInvoiceItemExid.ts
├── castToStripeInvoiceItem.ts
├── getProspectsAsInvoiceItems.ts
├── setInvoiceItems.ts
├── syncInvoiceDraft.ts
├── syncInvoiceDraftFromSource.ts
├── syncInvoiceDraftToStripe.ts
├── adjustInvoiceItemPrice.ts
├── reqInvoiceCharge.ts
├── cronDriveAllInvoicesToCollection.ts
├── ... (50 more operations from other domains)
```

namespace polluted. hard to see what belongs to draft vs adjust vs charge.

### evolution: lift when reused

if `castToStripeInvoiceItem` becomes needed by `adjust/` — lift immediately to `lifecycle/`:

```
src/logic/advertise/invoice/lifecycle/
├── castToStripeInvoiceItem.ts                  # lifted: reused by draft + adjust
│
├── draft/
│   ├── genInvoiceDraft.ts
│   ├── castProspectToInvoiceItemExid.ts        # still draft-specific
│   ├── getProspectsAsInvoiceItems.ts           # still draft-specific
│   └── syncInvoiceDraftToStripe.ts             # still draft-specific
│
├── adjust/
│   └── adjustInvoiceItemPrice.ts
│
└── charge/
    └── ...
```

only `castToStripeInvoiceItem` lifted. all other operations stay at their leaf.

## .signal: shared operations reveal domain relationships

when an operation is reused across domains, pause and ask:

| signal | interpretation |
|--------|----------------|
| many shared operations | domains may be falsely separated — consider merge |
| few shared operations | domains are correctly bounded — lift to common ancestor |
| orthogonal shared operations | cross-cut dimension — may warrant its own domain |

shared operations reveal fundamental relationships. sometimes they expose false boundaries drawn too eagerly. other times they reveal orthogonal dimensions that parallel across domains.

## .when to lift

lift immediately when reused:

| criterion | why |
|-----------|-----|
| 2+ usages across sibling domains | proven need, lift now |
| clear domain-aligned name | abstraction has semantic intent |

## .the heuristic

ask: "where is the most specific place this can live?"

- if only used by one workflow → nest in that workflow's folder
- if reused by 2+ sibling workflows → lift to their common ancestor

## .enforcement

flat structure with task-specific operations = nitpick

speculative lift (0 reuses) = nitpick

## .see also

- `rule.prefer.wet-over-dry` — when to generalize (different concern)
- `rule.require.bounded-contexts` — domains own their operations
