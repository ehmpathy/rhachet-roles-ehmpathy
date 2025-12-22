# 📊 effectiveness of teaching llms via example libraries

## ✅ strengths
- **highly effective for style & format control**
  - the model will reliably mimic demonstrated structures (e.g. JSON schema, markdown brief, SQL pattern).
- **task-specific alignment**
  - if the examples cover the distribution of tasks, the model adapts very well in-session.
- **fast & flexible**
  - no retraining, just update the example set.

---

## ⚠️ limits
- **shallow generalization**
  - effectiveness drops if the input strays outside what the examples illustrate.
- **rigid mimicry**
  - the model tends to overfit: it copies examples rather than abstracting.
- **context overhead**
  - effectiveness shrinks as the example library grows beyond the model’s active attention window.
- **no persistence**
  - nothing is learned across sessions — you must re-teach every time.

---

## 🎯 bottom line
- **short tasks, narrow domains:** very effective.
- **broad reasoning, novel domains:** much less effective.
- think of it as *teaching the llm to “act trained”* for one prompt — not actual durable learning.
