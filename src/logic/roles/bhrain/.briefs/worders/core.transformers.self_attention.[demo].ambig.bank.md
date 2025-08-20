# 🧩 .brief.demo: `multi-head self-attention on ambiguous words (value vectors evolve)`

## .what
this demo shows how two identical tokens — **“bank”** — begin with the same embedding but evolve into **different value vectors** after attention layers, depending on context. multi-head attention disambiguates their meaning dynamically.

---

## 🎯 purpose
- demonstrate that identical word embeddings diverge into context-specific meanings
- show how q, k, v vectors are derived from hidden states
- illustrate how attention causes “bank” (financial vs river) to separate

---

## ⚙️ demo setup

sentence:
> “the **bank** raised interest rates, and she sat by the **bank** of the river.”

toy hidden size = **4**, with **2 heads.**

---

### 🔹 step 1 — input embedding (same for both “bank”)

both tokens start with the **same embedding lookup** from the word embedding matrix:

- embedding(**bank**) = `[0.5, 0.7, 0.2, 0.1]`

this is identical for both occurrences, because embeddings are tied to vocabulary entries, not context.

---

### 🔹 step 2 — hidden states diverge

after one transformer block, the hidden state of each “bank” diverges due to attending to different neighbors:

- hidden(**bank_financial**) = `[0.8, 0.2, 0.6, 0.1]`
- hidden(**bank_river**)     = `[0.1, 0.9, 0.2, 0.7]`

---

### 🔹 step 3 — compute q, k, v from hidden states

each hidden state is projected by learned matrices \( W_q, W_k, W_v \).

for simplicity, show only **value (v)** vectors here:

- v(**bank_financial**) = `[0.6, 0.5, 0.7, 0.2]`
- v(**bank_river**)     = `[0.2, 0.8, 0.3, 0.6]`

note: originally both banks had the **same v** if taken right after embedding, but after context mixing, they diverge.

---

### 🔹 step 4 — multi-head specialization

- **head 1 (financial context):**
  “bank” attends to “interest rates” → reinforces v(**bank_financial**).

- **head 2 (geographic context):**
  “bank” attends to “river” → reinforces v(**bank_river**).

---

## 🧩 combined effect

- initially, both “bank” tokens share the same vector (embedding).
- after attention, their hidden states — and thus their q/k/v vectors — diverge.
- multi-head attention ensures each occurrence is contextualized differently.

---

## 📊 insight
- **embeddings** are static (same for same word).
- **hidden states** are dynamic (different for each occurrence).
- **q, k, v** are projections of hidden states, so they also differ per occurrence.
- result: llms resolve word sense disambiguation in context by letting identical tokens evolve into different representations.

in short: **same word, same start — different meaning, different vectors.**
