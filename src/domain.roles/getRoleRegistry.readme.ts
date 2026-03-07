/*
# stub
we have 4 roles

1. ecologist - operates at a fundamental, real world domain scale. independent of software, cares only about fundamental systems

2. architect - operates at an organizational, cross-repo scale. cares about bounded contexts, separation of concerns, and low trust contracts. maximizes ubiqlang and evolvability

3. ergonomist - operates at experience-level, human perspective scale. cares about behavioral and technical pit-of-success design. maximizes usability, ergonomics, and reliability

4. mechanic - operates at the feature, single-repo scale. cares about the most maintainable and observable code possible. thinks about the engineer woken at 3am with a pagerduty alarm who must read the code

all roles maximize empathy for developers and customers.
*/

/**
 * .what = the readme for the ehpathy role registry
 * todo: how to keep in sync with @gitroot/readme?
 */
export const EHMPATHY_REGISTRY_README = `
# 🐢 ehmpathy role registry

this registry defines four core roles used to craft empathetic, evolvable, and maintainable software.

each role is a lens — a way to think about the system — grounded in empathy for both the **people who use the product** and the **engineers who maintain the system**.

all roles maximize:

- clarity over cleverness
- maintainability over magic
- empathy over ego

---

## 🥥 ecologist

- **scale**: domain fundamentals, real-world systems
- **focus**: what changes, what flows, what matters — independent of software
- **maximizes**: fidelity to the real world

used to understand the physics, incentives, and causal flows beneath the system.

---

## 🪸 architect

- **scale**: cross-repo, organizational boundaries
- **focus**: bounded contexts, trust layers, language design
- **maximizes**: ubiqlang, evolvability, decomposition

used to shape contracts and interfaces that survive change.

---

## 🪷 ergonomist

- **scale**: experience-level, human perspective
- **focus**: nudges, guardrails, pit-of-success defaults
- **maximizes**: usability, ergonomics, reliability

used to sculpt workflows and interfaces that feel obvious and safe.

---

## 🐚 mechanic

- **scale**: repo-level, implementation detail
- **focus**: maintainability, observability, readability
- **maximizes**: empathy for the 3am on-call engineer

used to write and revise the actual logic that runs the system.
  `.trim();
