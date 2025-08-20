# 🧩 .brief: `llm inference = matmuls + vecmuls + elemuls`

## .what
llm inference is the process by which a trained language model transforms input tokens into output predictions. the computation can be reduced to three categories:

- **matmuls** → large matrix multiplications (heavy, parameter-rich ops)
- **vecmuls** → vector-scale multiplications/additions (normalization scale/shift, bias)
- **elemuls** → elementwise nonlinear operations (activations, softmax, residuals)

together, these form the skeleton of inference: heavy matmuls provide learned transformations, while vecmuls and elemuls act as the glue that gives nonlinearity and stability.

---

## 🎯 purpose
- apply billions of learned parameters (matmuls) to transform token inputs
- refine representations through normalization (vecmuls) and nonlinear activations (elemuls)
- output logits over vocabulary for next-token prediction

---

## ⚙️ method

### 🔑 what’s happening inside llm inference

1. **token embedding**
   - input tokens → dense vectors via embedding matrix (**matmul**).

2. **transformer layers**
   - **linear projections:** weight matrices × input (**matmuls**).
   - **attention mechanism:** query × key → attention weights (**matmul**), then weights × value (**matmul**).
   - **feed-forward networks:** matmuls with intermediate activation (**elemuls**).

3. **non-linearities & normalization**
   - **activations:** per-element functions (relu, gelu, etc.) = **elemuls**.
   - **normalization:** mean/variance across vector + learned scale/shift = **vecmuls + elemuls**.

4. **output layer**
   - final hidden state × vocab matrix → logits (**matmul**).

---

## 🧮 operation classes
- **matmuls:** embeddings, projections, attention (qkᵀ, softmax·v), feed-forward, output head.
- **vecmuls:** layernorm scale/shift, bias addition.
- **elemuls:** relu/gelu activations, softmax exponentials/divides, residual adds.

---

## 📊 insight
- **yes:** matmuls dominate compute and parameter count.
- **no:** inference is not *only* matmuls — vecmuls and elemuls are critical for expressivity and stability.
- **so:** inference = “giant chains of matmuls, with vecmuls and elemuls woven in.”

---

## 💻 toy pseudocode skeleton

\`\`\`python
def llm_inference(tokens, weights):
    # 1. embedding lookup (matmul)
    x = embed(tokens, weights["embedding"])   # matmul

    for layer in weights["layers"]:
        # 2. linear projections (matmuls)
        q = matmul(x, layer["Wq"])
        k = matmul(x, layer["Wk"])
        v = matmul(x, layer["Wv"])

        # 3. attention (matmuls + elemuls)
        attn_scores = matmul(q, k.T) / sqrt(d)    # matmul
        attn_weights = softmax(attn_scores)       # elemul
        attn_output  = matmul(attn_weights, v)    # matmul

        # 4. residual connection (elemul)
        x = x + attn_output                       # elemul

        # 5. normalization (vecmul + elemul)
        x = layernorm(x, layer["gamma"], layer["beta"])  # vecmul + elemul

        # 6. feed-forward network
        h = matmul(x, layer["W1"])                # matmul
        h = gelu(h)                               # elemul
        h = matmul(h, layer["W2"])                # matmul
        x = x + h                                 # elemul

    # 7. output projection (matmul)
    logits = matmul(x, weights["output"])         # matmul
    return logits
\`\`\`

---

in short: **llm inference = matmuls (heavy lifting) + vecmuls (scaling/shift) + elemuls (nonlinear glue).**
