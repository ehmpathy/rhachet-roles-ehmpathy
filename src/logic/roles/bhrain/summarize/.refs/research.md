🧠 1. intent-aware summarization
📌 key idea:
different summaries serve different goals
(e.g. recap, resolution, trace, action plan, status, etc.)

🔍 research basis:
Intent-Aware Summarization of Dialogue (Zhou et al., 2021)

Conversational Summarization Benchmarks (Chen et al., 2022)

✅ best practice:
before summarizing, identify the summary goal:

"inform the next step"

"extract decisions"

"recover intent"

"resolve ambiguity"

🧱 2. structured slot filling
instead of freeform summarization, use a structured template
with fields like: question, options, critiques, resolution

this improves:

clarity

LLM controllability

token efficiency

🔍 research basis:
QMSum (Zhong et al., 2021): query-based multi-turn meeting summarization

Schema-Guided Dialogue Summarization (Zhao et al., 2023)

🔁 3. hierarchical or recursive summarization
summarize in layers: per step → per group → final

useful when threads are long or contain loops

enables multi-resolution views (like headlines vs insight)

🔍 research basis:
Summarizing Dialogues with Discourse Structure (Zhao et al., 2020)

TextRank, SummaRuNNer, PEGASUS — hierarchical variants

🪜 4. step-tagged trace summarization (best for reasoning)
instead of summarizing raw text, track reasoning moves
e.g., narrate → diverge → converge → plan → resolve

this is especially powerful when you’re building:

chains-of-thought

agents with self-awareness

traceable decision-making

🔍 research basis:
Chain-of-Thought Prompting (Wei et al., 2022)

ToT (Tree of Thought) Reasoning (Yao et al., 2023)

ReAct (Reason + Act)

✅ best overall strategy: structured trace + intent alignment
combine:

🧱 structured slots — question, frame, explored, critiques, leading idea, resolved?

🧠 thinking-step awareness — tag what has been done and what’s next

🎯 intent reflection — keep track of whether user’s goal is satisfied

