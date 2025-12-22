# 🧩 .brief: lessons vs articles in llm context

## .what
within an llm’s **context window**, the choice between feeding it **lessons** or **articles** determines how it will generalize and respond.
- **lessons** = structured, causal, example-driven scaffolds → optimized for clarity and reuse.
- **articles** = expository, narrative, stylistic content → optimized for articulation and tone.

---

## .why (purpose)
- **lessons:** maximize transfer of reasoning patterns, problem-solving steps, and teaching clarity.
- **articles:** maximize stylistic fidelity, genre mimicry, and rhetorical richness.

---

## .model

| axis              | **lessons in context**                          | **articles in context**                     |
|-------------------|-------------------------------------------------|---------------------------------------------|
| **core fusion**   | explain × articulate (scaffolded knowledge)     | articulate (may include explain)            |
| **strengths**     | clarity, stepwise structure, reusable templates | tone, breadth, rhetorical and stylistic form |
| **weaknesses**    | narrow scope, less stylistic variety            | verbose, less causal scaffolding             |
| **best use**      | teaching, tutoring, applied reasoning tasks     | style transfer, perspective capture          |

---

## .takeaway
- **lessons compress more usable value per token** → best for clarity, reasoning, and consistency.
- **articles provide articulation patterns** → best for stylistic or rhetorical goals.

**in llm context:** if the task is *teach or solve*, prefer **lessons**. if the task is *sound like or persuade*, prefer **articles**.
