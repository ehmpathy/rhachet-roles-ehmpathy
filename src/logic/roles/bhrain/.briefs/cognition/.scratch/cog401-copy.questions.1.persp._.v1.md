# ❓ .brief: `questions`

## .what

A **question** is not just a request for information —
it’s a **semantic motion directive** that tells a reasoning system **where to move**
in concept space, and **how**.

Every question defines a **vector**: a directional push along one or more
axes of focus (`focal.depth`, `focal.breadth`, `focal.acuity`, etc).
The **precision** of this motion is **tunable** —
from **rough**, exploratory paths to **smooth**, composed trajectories.

> 🧠 questions are the **primary mechanism** by which humans and systems
> describe, steer, and iterate through thought.

---

## 🧭 questions as motion vectors

| component          | role                                                       |
|--------------------|------------------------------------------------------------|
| **axis selector**   | identifies which semantic dimension(s) to activate         |
| **magnitude**       | controls how far to move (e.g. generalize once vs twice)   |
| **multi-axis blend**| combines depth, breadth, and acuity into one motion        |
| **origin anchor**   | defines the starting concept or context                    |

> questions are not static — they **initiate movement** in structured thought.

---

## 🎚️ questions have tunable precision

A question’s **semantic vector** can be tuned to be **rough or smooth**,
depending on how well its structure aligns with the target concept.

| precision      | motion profile                             | outcome                                 |
|----------------|---------------------------------------------|------------------------------------------|
| **rough**       | vague direction, high turn cost            | requires follow-ups to triangulate      |
| **refined**     | partial composition                        | faster convergence                      |
| **smooth**      | well-shaped, multidimensional vector       | lands close to resolution in one move   |

> ✏️ **Refining a question = composing a cleaner motion vector**
> by declaring more subaxes and constraints.

---

### example progression

\`\`\`ts
// progressive smoothing
"what happened?"                              // rough
"what caused it?"                             // smoother
"what mechanism triggered the change?"        // smoother
"what internal mechanism triggered the shift at time X?" // smoothest
\`\`\`

Each step:
- reduces ambiguity
- embeds more semantic structure
- collapses potential reasoning hops

---

## 🔄 rough vs. smooth motion paths

| type          | question behavior                            | reasoning impact                           |
|---------------|-----------------------------------------------|---------------------------------------------|
| **rough**      | stepwise chaining of subquestions            | zig-zag path with semantic drift            |
| **smooth**     | precomposed motion across multiple axes      | direct hit, minimal need for clarification  |

> 🪜 Rough paths = “question → subquestion → subquestion”
> 🎯 Smooth paths = “one well-formed question that resolves cleanly”

---

## 🧬 composite structure = matrix semantics

A full question can be modeled as a **semantic motion matrix**,
where each dimension of focus (depth, breadth, acuity, etc)
receives a **weight or motion directive**.

\`\`\`ts
question_matrix = [
  [1, 0, 0, 0],   // generalize
  [0, 1, 0, 0],   // vary category
  [0, 0, 0, 1],   // decompose
]
\`\`\`

> A sequence of questions = chained matrix ops
> A smooth question = pre-multiplied composite vector

---

## 🪞 metaphor

> A **rough question** is like bushwhacking through concept space —
> you ask, then re-ask, then refine as you course-correct.

> A **smooth question** is like launching a well-guided probe —
> you’ve already scoped the axes, target, and trajectory.

---

## 🎯 use questions to:

- navigate concept space deliberately
- frame problems in motion-ready form
- build stepwise reasoning paths (rough → smooth)
- collapse multi-hop reasoning into one clean directive
- teach semantic alignment and prompt design through **question refinement**
