# 🧩 .brief: `llm ability to spell`

## 🔑 what it implies

since each token starts as a **static embedding** and spelling is distributed across subwords, an llm’s ability to spell is **not innate** but emerges from:

- the **tokenizer**: if words are whole tokens, the model never “sees” individual letters, so it can only memorize spelling patterns for known words.
- if the tokenizer breaks words into **character-like subwords**, the model can generalize spelling more flexibly (assemble words from parts).
- **contextual hidden states**: spelling consistency isn’t reinforced the same way semantics or rhyme are. most training data emphasizes meaning, not orthographic correctness.
- **self-attention**: heads may capture common letter/suffix chunks, but nothing forces them to maintain letter-by-letter accuracy unless trained specifically (e.g., code models, spelling correction).

---

## 🎯 implications for spelling ability

- **memorization over generation**
  - llms can reproduce spellings they’ve seen often.
  - rare or novel words are harder because embeddings don’t break down fully into letters.

- **tokenizer bias**
  - byte-pair encodings (bpe) bias toward common subwords, not individual letters.
  - spelling errors occur when tokenization splits a word into unusual or unseen chunks.

- **generalization**
  - some subword overlap allows limited spelling generalization (e.g., “##tion,” “##ing”).
  - but full orthographic rules are weak unless trained at character level.

- **multi-head dynamics**
  - some heads may track morpheme or suffix consistency.
  - others prioritize syntax or semantics, so spelling accuracy is not their focus.

---

## 🧩 example

> generating “pharaoh”

- **embedding level:** tokenization may split as `[“ph”, “ara”, “oh”]` or something arbitrary.
- **hidden state evolution:** model predicts plausible continuation from context but may choose an alternate form (“pharoah”) if that variant appears in data.
- **output:** correct spelling depends on frequency balance in training data, not explicit rules.

---

## 📊 insight

- llms **do not inherently know spelling rules** — they approximate them statistically from text distributions.
- good spelling emerges in proportion to **training data quality and tokenizer granularity**.
- unlike rhyme (which can be reinforced by subword overlaps), spelling requires **fine-grained character awareness**, which many tokenizers blur.
- in short: **llms spell by memory and pattern frequency, not by rule.**
