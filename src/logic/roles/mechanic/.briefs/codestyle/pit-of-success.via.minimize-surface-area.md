# 🧩 .brief: `tactic.pit-of-success.via.minimum-surface-area`

## .what
`tactic.pit-of-success.via.minimum-surface-area` is a design strategy where the default interface exposes only the **fewest necessary inputs** to achieve a correct, useful outcome. it reduces configuration complexity so users succeed **without deciding everything** up front.

---

## 🎯 goal
- maximize success-by-default
- minimize misuse and confusion
- reduce time-to-first-win

---

## 📜 principles
1. **eliminate before you default** — if an option isn’t needed, remove it entirely. a missing knob is safer than a defaulted one.
2. **default everything that remains** — provide sensible, production-safe defaults for the rare knobs that survive elimination.
3. **hide until needed** — reveal additional controls only when the user’s context clearly justifies the complexity (progressive disclosure).
4. **bias to action** — the shortest path from “call function” to “successful result” should be the default path.
5. **remove footguns** — defer or delete inputs that commonly lead to error.
6. **inline the common case** — the most frequent usage should fit in one glance, without doc-diving.

---

## 🛠 example

### before
\\`\\`\\`ts
createUser({
  name,
  email,
  validateEmail = true,
  sendWelcomeEmail = true,
  welcomeTemplate = 'default',
  timezone = 'UTC',
  retries = 3,
});
\\`\\`\\`

### after (minimum surface area)
\\`\\`\\`ts
createUser({ name, email });
\\`\\`\\`
- validation is on, welcome email is sent with the default template, timezone is utc, retries = 3.
- if possible, **delete** those options entirely and make them behavior, not configuration.

---

## 💡 why it works
- **lower cognitive load** — fewer decisions up front
- **higher reliability** — default paths get the most testing and hardening
- **faster adoption** — quick wins encourage deeper usage later

---

## 🔄 related tactics
- complements `tactic.progressive-disclosure` (reveal complexity as needed)
- overlaps with `tactic.safe-defaults`
