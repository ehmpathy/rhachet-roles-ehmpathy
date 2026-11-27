# rule.forbid.directory.by-secondary-noun

## .what

never place a file in a directory named for any noun but its filename's **primary noun** — the first noun after the verb. a directory named for a secondary noun, a status, a concern, or a verb splits peers that belong together and buries a file where no reader looks for it.

## .why

- **it splits peers** — `setStoneAsBlocked` in `blocked/` sits apart from `setStoneAsPassed` in `stones/`. a reader of `stones/` sees four of five handlers and misses the fifth
- **it hides the primary subject** — the file operates on a Stone; the directory says it is about Blocked
- **it invites debate** — a secondary noun is a choice among several, so two people pick two dirs. the primary noun is read off the filename, so two people land on one

## .the smell

- a status-named or concern-named directory at a domain root (`blocked/`, `promise/`, `contemplate/`) that holds handlers for a broader noun
- a verb handler apart from its peer handlers: `setStoneAs*` spread across several dirs
- a file whose first noun after the verb names no segment of its directory path

## .the cure

read the directory off the filename (`rule.require.directory.by-primary-noun`):

1. strip the verb; the first noun is the top directory — `setStoneAsBlocked` → `stones/`
2. descend to a narrower sub-noun only where the hierarchy names one and it clusters
3. a handler sits at the broad noun with its peers; the machinery about a narrow concern nests at its own noun — `getBlockedChallengeDecision` → `stones/blocked/`

## .examples

### 👎 bad — clustered by a secondary noun

```
route/
├── blocked/
│   ├── setStoneAsBlocked.ts             ← handler of Stone, buried under Blocked
│   └── getBlockedChallengeDecision.ts
└── stones/
    ├── setStoneAsPassed.ts
    └── setStoneAsApproved.ts
```

### 👍 good — placed by the primary noun

```
route/
└── stones/
    ├── setStoneAsPassed.ts
    ├── setStoneAsApproved.ts
    ├── setStoneAsBlocked.ts             ← with its peers
    └── blocked/
        └── getBlockedChallengeDecision.ts   ← machinery, noun: Blocked
```

## .enforcement

- a file in a directory named for a noun other than its primary noun = **blocker**
- a verb handler split from its peer handlers by a secondary noun = **blocker**

## .see also

- `rule.require.directory.by-primary-noun` — the require twin, with the full algorithm and worked reorganization
- `rule.require.group-by-noun-not-verb` — the directory is a noun, never a verb
- `rule.forbid.misplaced-operations` — the depth twin: the right ancestor, once the noun is right
