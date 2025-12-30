# 🧩 .brief.lesson: prefer transformer:pipelines over conditional:mazes

---

## 🌳 conditional:mazes

you treat each case as a fork in the road:

\`\`\`ts
if (dotfileNoExt) {
  return ...
} else if (hasExt) {
  return ...
} else {
  return ...
}
\`\`\`

- **pros**
  - explicit, easy to follow with 2–3 cases

- **cons**
  - grows fast: every new edge case means a new twist in the maze
  - fragmented: “which corridor am i in right now?”
  - more test cases: you need one per branch

> conditionals are a **maze** — each new edge case adds another turn,
> and you can get lost as you trace which branch leads where.

---

## 🌊 transformer:pipelines

normalize the data into a *sequence* and let transformations filter, drop, or join pieces:

\`\`\`ts
return [parts.name, \`i\${attempt}\`, parts.ext.replace(/^\./, '') || null]
  .filter(isPresent)
  .join('.');
\`\`\`

- **pros**
  - handles dotfiles, no-ext, and normal files with the same flow
  - future-proof: if `ext` is empty, the pipeline just drops it
  - fewer "paths" → less test explosion
  - intent is clear: *“take parts, add attempt, add ext if present, join with dots”*

- **cons**
  - sometimes less explicit about special rules (e.g. `.env` → `env.i7`)
  - requires discipline: not every problem is pipeline-friendly

> pipelines are **transformers** — they take data in, apply consistent stages,
> and yield output without need to remember the map.

---

## 🔍 why pipelines shine here

1. **fewer parts** — single expression instead of scattered branches
2. **symmetry** — all inputs flow through the same transformation
3. **readability** — you immediately see the intent
4. **testability** — one flow, many inputs, fewer branches to cover

---

## 🧩 comparison

### conditional:maze
\`\`\`ts
if (ext) {
  return \`\${name}.i\${attempt}.\${ext}\`;
}
if (dotfile) {
  return \`\${base.slice(1)}.i\${attempt}\`;
}
return \`\${base}.i\${attempt}\`;
\`\`\`

### transformer:pipeline
\`\`\`ts
return [name, \`i\${attempt}\`, ext?.replace(/^\./, '')]
  .filter(Boolean)
  .join('.');
\`\`\`

- pipeline covers **all cases at once**
- conditional maze scatters logic across multiple passages

---

## 🔑 general lesson

> **prefer transformer:pipelines over conditional:mazes**

- replace `if/else` with **optional data elements**
- use a pipeline (`map` / `filter` / `join`) to combine them
- outcome: shorter, more composable, easier to test, harder to get lost
