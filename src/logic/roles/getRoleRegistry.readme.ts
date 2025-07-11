/*
# stub
we have 4 roles

1. ecologist - operates at a fundamental, real world domain scale; independent of software, cares only about fundamental systems

2. architect - operates at an organizational, cross-repo scale. cares about bounded contexts, separation of concerns, and low trust contracts. maximizes ubiqlang and evolvability

3. designer - operates at feature, cross-repo scale. cares about behavioral and techical pit-of-success design. maximizes evolvability, maintainability, and reliability

4. mechanic - operates at the feature, single-repo scale. cares about writing the most maintainable and observable code possible. thinks about the engineer who's going to be woken-up at 3am with a pagerduty alarm and going to have to read the code

all roles maximize empathy for developers and customers.
*/

/**
 * .what = the readme for the ehpathy role registry
 * todo: how to keep in sync with @gitroot/readme?
 */
export const EHMPATHY_REGISTRY_README = `
# 🤝 ehmpathy role registry

This registry defines the four core roles used to craft empathetic, evolvable, and maintainable software.

Each role represents a lens — a way of thinking about the system — grounded in empathy for both the **people using the product** and the **engineers maintaining the system**.

All roles maximize:

- clarity over cleverness
- maintainability over magic
- empathy over ego

---

## 🌱 Ecologist

- **scale**: domain fundamentals, real-world systems
- **focus**: what changes, what flows, what matters — ignoring software
- **maximizes**: fidelity to the real world

Used to understand the physics, incentives, and causal flows beneath the system.

---

## 🏛 Architect

- **scale**: cross-repo, organizational boundaries
- **focus**: bounded contexts, trust layers, language design
- **maximizes**: ubiqlang, evolvability, decoupling

Used to shape contracts and interfaces that survive change.

---

## 🎨 Designer

- **scale**: feature-level, user-experience layer
- **focus**: nudges, guardrails, pit-of-success defaults
- **maximizes**: usability, ergonomics, reliability

Used to sculpt workflows and interfaces that feel obvious and safe.

---

## 🔧 Mechanic

- **scale**: repo-level, implementation detail
- **focus**: maintainability, observability, readability
- **maximizes**: empathy for the 3am on-call engineer

Used to write and revise the actual logic that runs the system.
  `.trim();
