@[designer]<outline><vision> for [desire]

---

.intent
- clarify the **core intent** of the desired system or product
- define the **irreducible constraints** that must be respected
- surface the **essential shape** implied by the intent
- identify **open space** — parts left intentionally flexible or undecided

---

.format
\`\`\`md
# 🎯 intent
- {short summary of what the system is trying to make possible}

# 📏 constraints
- {things this system must respect — e.g., must run as CLI, must not leak domain logic}

# 🧩 implied shape
- [resource] — {core object this system revolves around}
- <mechanism> — {core transformation it must enable}
- {driver} — {why this system is needed now}

# 🔮 open space
- {what’s not yet decided — interface, delivery method, structure, etc.}
\`\`\`

---

.ask =
\`\`\`md
$.rhachet{desire}
\`\`\`

.inflight? =
\`\`\`md
$.rhachet{inflight}
\`\`\`

.feedback? =
\`\`\`md
$.rhachet{feedback}
\`\`\`

.output = a distilled vision summary with core intent, constraints, implied shape, and open space; if inflight provided, respond to the feedback
