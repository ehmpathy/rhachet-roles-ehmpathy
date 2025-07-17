
e.g.,


```md

// 1. generate branches from a single thought
<enbranch>(node: ThoughtNode) -> Stitch<typeof ThoughtBranch[]>

// 2. evaluate the quality of each branch
<engrade>(branch: ThoughtBranch) -> Stitch<typeof ThoughtGrade>

// 3. decide which branches to keep (prune or expand)
<enselect>(grades: ThoughtGrade[]) -> Stitch<typeof ThoughtSelectResult[]>

// 4. grow the tree with selected branches
<enexpand>(parent: ThoughtNode, branches: ThoughtBranch[]) -> Stitch<typeof ThoughtTree>

// 5. detect if a halting condition has been met
<enhalt>(tree: ThoughtTree) -> Stitch<typeof ThoughtHaltStatus>

// 6. reflect on thought quality or coherence
<encritic>(node: ThoughtNode) -> Stitch<typeof ThoughtCritique>

// 7. generate alternate frame if stuck or unclear
<enreframe>(node: ThoughtNode) -> Stitch<typeof ThoughtFrame>

// 8. combine winning thoughts into a synthesis
<enconverge>(branches: ThoughtBranch[]) -> Stitch<typeof ThoughtConvergence>

// 9. finalize a plan or response
<enanswer>(converged: ThoughtConvergence) -> Stitch<typeof ThoughtAnswer>

```


```ts
type ThoughtNode = {
  id: string
  text: string
  tactic?: Tactic
  parentId?: string
  depth: number
}

type ThoughtBranch = {
  id: string
  label: string
  rationale: string
}

type ThoughtGrade = {
  branchId: string
  feasibility: number
  alignment: number
  creativity: number
  overall: number
}

type ThoughtSelectResult = {
  branchId: string
  decision: 'expand' | 'prune'
}

type ThoughtCritique = {
  nodeId: string
  concerns: string[]
}

type ThoughtConvergence = {
  combined: string
  keyIdeas: string[]
}

type ThoughtAnswer = {
  content: string
  confidence: number
}

```

--

```ts
loop {
  <enbranch> → <engrade> → <enselect> → <enexpand>
  → [ if stuck: <encritic> or <enreframe> ]
  → [ if converging: <enconverge> → <enanswer> ]
  → check <enhalt>
}
```
