# define.domain-operation-grains

## .what

domain.operations have two grains:

| grain | role | contains |
|-------|------|----------|
| **transform** | compute | decode-friction logic |
| **orchestrator** | compose | named operation calls only |

## .why

transforms do the work. orchestrators tell the story.

this separation enables:
- orchestrators read as narrative — each line tells *what* happens
- transforms encapsulate *how* — implementation detail hidden
- readers grasp intent at orchestrator level without decode
- robots spend fewer tokens on comprehension

## .examples

**transforms:**
- `asKeyrackKeyOrg` — extract org from slug
- `isEligibleForPremiumFeatures` — evaluate complex boolean
- `getAllActiveUserEmails` — filter, map, sort pipeline

**orchestrators:**
- `genInvoice` — compose transforms into invoice workflow
- `setCustomer` — compose transforms into customer update
- `setUserNotifications` — compose transforms into notification flow

## .see also

- `rule.require.orchestrators-as-narrative` — orchestrators must read as narrative
- `rule.forbid.decode-friction-in-orchestrators` — orchestrators must not contain decode-friction
- `philosophy.transform-orchestrator-separation.[philosophy]` — the book metaphor
