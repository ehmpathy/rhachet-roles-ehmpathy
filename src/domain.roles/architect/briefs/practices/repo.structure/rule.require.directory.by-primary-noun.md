# rule.require.directory.by-primary-noun

## .what

a file's directory is decided by the **primary noun** of its filename — the noun-head that leads the noun-hierarchy right after the verb. this rule is the deterministic *algorithm* that composes two extant rules into a single, mechanical placement decision:

- `rule.require.group-by-noun-not-verb` — *what* the directory is named (a noun, never a verb)
- `rule.prefer.most-common-denominator` — *how deep* the directory nests (the most-specific place)

together they answer "which directory does this file go in?" without judgment. this brief makes that answer easy to reach.

## .why

- folder-structure decisions should be **derivable, not debated** — the filename already encodes the answer
- two people who apply the algorithm to the same file land on the same directory
- the structure stays legible: a reader lands on a directory and sees one subject's whole surface
- it removes the repeated "where does this go?" friction that shows up on every new file

## .the filename grammar

per `rule.require.treestruct`, a mechanism filename is `[verb][...nounHierarchy][state]?`:

```
setStoneAsBlocked
│  └────────────┐
verb  nounHierarchy = Stone → As → Blocked
      │
      primaryNoun = Stone
```

```
getRouteGuardReviewPeerContemplationStatus
│  └──────────────────────────────────┐
verb  nounHierarchy = Route → Guard → Review → Peer → Contemplation → Status
      │
      primaryNoun path = RouteGuardReviewPeer  →  guard/review/peer/
```

the **primary noun** is the noun-head that comes first. when the noun-hierarchy maps onto an extant directory hierarchy, that mapped path IS the directory.

## .the algorithm

to place a file, in order:

1. **parse the filename** into `[verb][...nounHierarchy]`. drop the verb — it leads the *filename*, never the *directory*.
2. **read the noun-hierarchy** left-to-right. the first noun (and its sub-nouns) name the directory path.
3. **maximally nest** (`most-common-denominator`): descend to the most-specific sub-noun directory that the hierarchy names and that is warranted today. do not stop short at a broad ancestor when a narrower noun applies.
4. **do not over-nest**: only create a sub-noun directory when a noun genuinely clusters (2+ files about that sub-noun, or a self-evidently distinct subdomain). a lone file stays at its nearest established noun.
5. **verb handlers cluster by their shared primary noun; their machinery nests one level deeper by its own narrower noun.**

step 5 is the subtle one — see the worked example.

## .the subtlety: handler vs machinery

a status transition like `--as blocked` produces two *kinds* of file, and they have *different* primary nouns:

| file | primary noun | directory |
|------|--------------|-----------|
| `setStoneAsBlocked` | **Stone** (it operates on the stone) | `stones/` |
| `getBlockedChallengeDecision` | **Blocked** (it is about the blocked-status machinery) | `stones/blocked/` |
| `setBlockedTriggeredReport` | **Blocked** | `stones/blocked/` |

the verb *handler* is "about the stone" → it sits flat in `stones/` beside its peer handlers (`setStoneAsPassed`, `setStoneAsApproved`, …). the *machinery* is "about the blocked concern" → it nests into `stones/blocked/`.

this is exactly the pit the algorithm rescues you from: the intuition "cluster all-things-blocked together" would bury `setStoneAsBlocked` in a `blocked/` dir and split it from `setStoneAsPassed` — a breach of group-by-noun (the handler's noun is Stone, not Blocked). the filename tells the truth: `setStone…` → `stones/`.

## .worked example

a real reorganization. before — three verb-ish status dirs at the domain root, each one a mix of a handler and its machinery:

```
route/
├── blocked/
│   ├── setStoneAsBlocked.ts          ← handler (noun: Stone)
│   ├── getBlockedChallengeDecision.ts  ← machinery (noun: Blocked)
│   └── setBlockedTriggeredReport.ts    ← machinery (noun: Blocked)
├── promise/
│   ├── setStoneAsPromised.ts          ← handler (noun: Stone)
│   ├── getSelfReviewChallengeDecision.ts  ← machinery (noun: SelfReview)
│   └── getStonePromises.ts               ← machinery (noun: SelfReview/Promise)
├── contemplate/
│   ├── setStoneAsContemplated.ts      ← handler (noun: Stone)
│   └── getRouteGuardReviewPeerContemplationStatus.ts  ← machinery (noun: …ReviewPeer)
└── stones/
    ├── setStoneAsPassed.ts
    └── setStoneAsApproved.ts
```

the handlers were scattered away from their peers; the machinery names already declared a different noun than their dir. after — the filename noun decides every placement:

```
route/
├── stones/
│   ├── setStoneAsPassed.ts
│   ├── setStoneAsApproved.ts
│   ├── setStoneAsBlocked.ts          ← handler → stones/ (noun: Stone)
│   ├── setStoneAsPromised.ts         ← handler → stones/
│   ├── setStoneAsContemplated.ts     ← handler → stones/
│   └── blocked/
│       ├── getBlockedChallengeDecision.ts    ← machinery → stones/blocked/
│       └── setBlockedTriggeredReport.ts
└── guard/
    └── review/
        ├── peer/
        │   ├── getRouteGuardReviewPeerContemplationStatus.ts  ← noun: …ReviewPeer
        │   └── getAllRouteGuardReviewPeersUncontemplated.ts
        └── self/
            ├── getSelfReviewChallengeDecision.ts   ← noun: SelfReview
            └── getStonePromises.ts
```

every move is forced by the filename, not chosen:
- `setStone…` → `stones/`
- `…Blocked…` machinery → `stones/blocked/`
- `…SelfReview…` / `…Promise…` machinery → `guard/review/self/`
- `…RouteGuardReviewPeer…` machinery → `guard/review/peer/`

no `blocked/`, `promise/`, or `contemplate/` verb-ish dir survives at the root — the nouns absorbed them.

## .heuristic

ask, in order:

1. "strip the verb — what is the first noun of the filename?" → that is the top directory.
2. "does the noun-hierarchy name a narrower sub-noun?" → descend to it if it clusters (most-common-denominator).
3. "is this a *handler* that operates on a broad noun, or *machinery* about a narrow noun?" → the handler sits at the broad noun with its peers; the machinery nests at its own narrow noun.

## .enforcement

- a file placed in a directory that does not match its filename's primary noun = blocker
- a verb handler split from its peer handlers because it was clustered by a *secondary* noun = blocker
- a lone file force-nested into a speculative sub-noun dir (0 other files) = nitpick (`most-common-denominator`)

## .see also

- `rule.require.group-by-noun-not-verb` — the directory is a noun (what)
- `rule.prefer.most-common-denominator` — nest at the most-specific place (how deep)
- `rule.require.treestruct` — the `[verb][...noun]` filename grammar this reads
- `rule.require.get-set-gen-verbs` — the verb leads the filename, never the directory
- `rule.prefer.directory.subdomain-clusters` — the prefer-level counterpart: proactively cluster ops into subdomain dirs
