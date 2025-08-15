# `<enquestion>.tactic.perspectives` — parallel multi-perspective question generation

*generate, curate, and catalog diverse questions from many perspectives in parallel.*

**purpose**
generate the richest, most diverse, and well-structured set of questions possible by leveraging parallelized, high-variance thinking across multiple perspectives.

---

## steps

1. **run `<enquestion>` repeatedly**
   - **parallel:** execute many `<enquestion>` calls simultaneously
   - **high temperature:** encourage creative divergence by increasing variability
   - **multi-perspective:** supply each run with different [context] or [role] to surface unique angles

2. **`<curate>` → produce a `[gallery]` of questions**
   - `<collect>` all raw questions from every run
   - `<cluster>` by thematic or semantic similarity
   - `<triage>` to remove duplicates, irrelevancies, and low-value items

3. **`<catalogize>` → produce a `[catalog]` of questions**
   - organize final questions into a structured, reusable index
   - annotate with tags, difficulty, scope, or intended audience

---

## outcome
a `[catalog]` containing the best, most contextually diverse set of questions — **curated from many perspectives** and ready for structured use.

---

## example syntax
\`\`\`
<enquestion>.with(perspectives) -> [catalog]
\`\`\`
