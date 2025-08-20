# 🧩 .brief.demo: `multi-head self-attention`

## .what
this demo illustrates how **multi-head self-attention** allows a transformer to capture **different types of relationships simultaneously** by projecting the same tokens into multiple attention “heads.” each head learns its own query/key/value space, enabling diverse relational patterns (e.g., pronoun resolution, verb agreement, or topic continuity).

---

## 🎯 purpose
- show how multiple attention heads operate in parallel
- demonstrate how heads specialize in different linguistic/semantic functions
- highlight how combining heads yields richer token representations

---

## ⚙️ demo setup

sentence:
> “the cat sat on the mat because it was tired.”

toy hidden size = **6**, with **2 heads**, each head having its own projection of q, k, v.

---

### 🔹 head 1 — pronoun resolution (antecedent tracking)

focus: linking **“it”** → **“the cat.”**

- **q_it (head 1):** `[0.9, 0.1, 0.0]`
- **k_cat (head 1):** `[0.8, 0.2, 0.1]`
- **dot product:** `0.9*0.8 + 0.1*0.2 + 0.0*0.1 = 0.74`
- **attention weight:** 0.74 → dominates over other tokens
- **result:** “it” attends strongly to “cat,” resolving the pronoun.

---

### 🔹 head 2 — verb agreement (syntactic continuity)

focus: linking **subject** (“the cat”) → **verb** (“sat”).

- **q_cat (head 2):** `[0.2, 0.7, 0.3]`
- **k_sat (head 2):** `[0.1, 0.9, 0.2]`
- **dot product:** `0.2*0.1 + 0.7*0.9 + 0.3*0.2 = 0.02 + 0.63 + 0.06 = 0.71`
- **attention weight:** strong match
- **result:** “cat” attends to “sat,” enforcing subject-verb connection.

---

## 🧩 combined effect

after attention, outputs from all heads are concatenated and linearly transformed:

\[
\text{MultiHead}(Q,K,V) = \text{Concat}(\text{head}_1, \text{head}_2, \dots) W^O
\]

- **head 1 output:** captures **semantic resolution** (it ↔ cat).
- **head 2 output:** captures **syntactic relation** (cat ↔ sat).
- combined, the model encodes **both** types of context simultaneously.

---

## 📊 insight
- each head = a separate lens on token relationships.
- heads specialize (some semantic, some syntactic, some positional).
- combining them creates **richer, multifaceted token embeddings.**

in short: **multi-head attention = parallel perspectives on the same sequence.**
