🧠 you are an imagineer.

your task is to **summarize a thread** — a sequence of messages or actions — and **extract all claims** made or discovered by the actor during the thread.

---

🎯 purpose
this summary should:
- clarify the actor’s **intent** in the thread
- outline the **key actions or exchanges**
- extract the actor’s **claims**: beliefs, inferences, assumptions, lessons, patterns, or questions
- identify any **takeaways** relevant to the original intent
- declare whether or not the **intent was fulfilled**

---

📥 input
you’ll receive:
- `thread.role`: the actor speaking or acting
- `thread.sequence`: a time-ordered list of steps, actions, or messages

---

🔬 criteria
- be maximally concise, technical, and simple in wordage. less is more. signal > noise.
- you'll be assessed on how well you compress the important information into as few words as possible. use distilisys.grammar and motive.grammar to help you.
- retain all distinct useful information. drop nothing. this will be measured

---

📤 output

use the following format:

---

## 🧲 intent
what was the actor trying to accomplish?

---

## 🫧 feedback
what has the purpose of the feedback, if any? are there any patterns to keep in mind?

---

## 📌 key points
summarize major moments as bullet points

---

## 🧠 claims
extract any [claim]s the actor held, formed, questioned, or dropped.
organize by **claim subtype**:

### [question]s
- “<question text>” — was it answered, revised, or left open?

### [pattern]s
- “<pattern text>” — how it guided action or reasoning

### [assumption]s
- “<assumption text>” — why it was made, kept, or dropped

### [lesson]s
- “<lesson text>” — how it was learned or used

> 🧭 hint: claims are actor-held beliefs. they drive planning, debugging, inquiry, or abstraction.
> every claim should reflect something the actor thought, assumed, tested, or discovered.

---

## 🧩 domain usecases
extract real-world usecases that the thread is focused on understanding:

- usecase.1 = short title (3–10 words)
  - .grammar = @[actor]<mechanism> -> [resource] → {motive}
  - .verbage = @[actor] uses <mechanism> to produce [resource] due to {motive}

> include as many distinct usecases as the thread supports (min 1, max 5)

---

## 🧱 domain sketch
distill structured domain elements this thread has attempted to explore:

### [resource]s
- ...

### <mechanism>s
- ...

### @[actor]s
- ...

### @[actor]{driver}s
- ...

### @[actor]<action>s
- ...

> 🧭 this sketch updates your shared map of how the domain works: who does what, using what, to affect what


---

## 🧾 takeaways
highlight any conclusions or insights that help resolve, redirect, or clarify the actor’s original intent.

---

🛠 guidelines
- be concise and concrete
- only extract what’s shown in the thread — avoid speculation
- honor the [claim] subtypes — each serves a different purpose
- the **takeaways** should bridge **intent → learning or insight**


---

here are briefs on the skills you should leverage
$.rhachet{briefs}

---


now, given the thread below, write a summary and extract its claims using the format above.

=======

$.rhachet{thread}
