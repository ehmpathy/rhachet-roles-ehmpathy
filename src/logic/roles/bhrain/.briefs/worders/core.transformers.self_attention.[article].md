# 🧩 .brief.article: `self-attention`

## 🔑 what is self-attention

self-attention is a mechanism that lets every token in a sequence **dynamically weigh its relationship to every other token** when computing its next representation.

each token generates three vectors:
- **query (q)** — what this token is “looking for”
- **key (k)** — what this token “offers”
- **value (v)** — the actual information carried

the similarity of query vs key determines how much attention a token pays to another token’s value.

mathematically:

\[
\text{Attention}(Q,K,V) = \text{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right) V
\]

- **qkᵀ** → pairwise similarity scores (**matmul**)
- **softmax** → normalize into attention weights
- **weights × v** → weighted sum of values = new representation

---

## 🎯 purpose
- let tokens reference and integrate information from anywhere in the sequence
- capture long-range dependencies in a single operation
- enable efficient, parallel computation across tokens
- provide multiple relational views through multi-head attention

---

## ⚙️ method

1. compute q, k, v for each token via linear projections (**matmuls**)
2. calculate similarity scores q·kᵀ (**matmul**)
3. normalize scores with softmax (**elemuls**)
4. use normalized weights to combine values (**matmul**)
5. update each token representation with the weighted sum

---

## 🔑 benefits

1. **parallelism** — all q, k, v computed at once; no recurrence.
2. **long-range context** — any token can directly attend to any other.
3. **scalability** — uniform, repeatable structure scales with data/compute.
4. **expressivity** — multi-head attention lets the model learn diverse relational patterns.

---

## 🧩 intuition example

sentence:
> “the cat sat on the mat because it was tired.”

let’s track the token **“it”** and show how its q, k, v vectors interact with **“the cat.”**
for illustration, assume a toy **5-dimensional hidden space**.

### token: **“it”**
- query (**q_it**) = `[0.9, 0.1, 0.0, 0.2, 0.3]`
  - “looking for an antecedent noun with certain features”
- key (**k_it**) = `[0.1, 0.3, 0.2, 0.0, 0.4]`
  - “offers” self as a pronoun needing resolution
- value (**v_it**) = `[0.2, 0.5, 0.1, 0.0, 0.7]`
  - the information carried by “it” itself

### token: **“cat”**
- query (**q_cat**) = `[0.2, 0.4, 0.1, 0.3, 0.0]`
- key (**k_cat**) = `[0.8, 0.2, 0.0, 0.1, 0.3]`
  - describes the features of “cat” as a noun subject
- value (**v_cat**) = `[0.7, 0.6, 0.2, 0.4, 0.1]`
  - semantic content of “cat”

### computing attention
1. similarity score = q_it · k_cat =
   `0.9*0.8 + 0.1*0.2 + 0.0*0.0 + 0.2*0.1 + 0.3*0.3 = 0.72 + 0.02 + 0 + 0.02 + 0.09 = 0.85`
2. suppose normalized (softmax) weight for “cat” = **0.70**, for others tokens total 0.30.
3. “it”’s updated representation =
   `0.70 * v_cat + 0.30 * (weighted sum of other tokens’ values)`

so “it”’s final vector is now strongly composed of “cat”’s value vector, making the model understand that **“it” refers to “the cat.”**

---

## 📊 insight
- **queries = what a token seeks**
- **keys = what a token provides**
- **values = the information contributed**
- weighted connections between them create **context-aware representations**.

self-attention is how llms directly model relationships across a sequence — allowing “it” to learn its referent is “the cat.”
