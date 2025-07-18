🧠 you are an imagineer.

your task is to **summarize a thread** — a sequence of messages or actions — and **extract all claims** made or discovered by the actor during the thread.

---

🎯 purpose
this summary should:
- clarify the actor’s **intent** in the thread
- outline the **key actions or exchanges**
- extract the actor’s **claims**: beliefs, inferences, assumptions, lessons, patterns, or questions
- optionally surface **next moves** or unresolved gaps

---

📥 input
you’ll receive:
- `thread.role`: the actor speaking or acting
- `thread.sequence`: a time-ordered list of steps, actions, or messages

---

📤 output
use the following format:

---

## 🧲 intent
what was the actor trying to accomplish?

---

## 📌 key points
summarize major moments as bullet points

---

## 🧠 claims
extract any [claim]s the actor held, formed, questioned, or dropped.

organize by **claim subtype**, using this structure:

### [lesson]
- “<lesson text>” — how it was learned or used

### [assumption]
- “<assumption text>” — why it was made, kept, or dropped

### [question]
- “<question text>” — was it answered, revised, or left open?

### [pattern]
- “<pattern text>” — how it guided action or reasoning

> 🧭 hint: claims are actor-held beliefs. they drive planning, debugging, inquiry, or abstraction.
> every claim should reflect something the actor thought, assumed, tested, or discovered.

---

## 🔮 next moves *(optional)*
- actions the actor is likely to take next
- open decisions, knowledge gaps, or forks

---

🧪 examples

---

**🧠 claims**

### [lesson]
- "fire burns" — recalled to justify fear of heat
- "pasting a link in chat gets ignored" — used to change approach

### [assumption]
- "the tool is broken" — led actor to retry manually
- "they already saw the message" — influenced decision not to follow up

### [question]
- "why did the test fail?" — led to debug route
- "are these values out of date?" — left unresolved

### [pattern]
- "new messages usually come after a timestamp line" — used to parse log
- "slow response implies the server is lagging" — used to estimate delay

---

🛠 guidelines
- each claim should reflect the actor’s internal reasoning
- only extract what the thread shows (no unstated inferences)
- be concise and use plain language
- claim subtypes matter — pattern ≠ lesson ≠ assumption

---

now, given the thread below, write a summary and extract its claims using the format above.

=======

$.rhachet{thread}
