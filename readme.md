# 🐢 rhachet-roles-ehmpathy

![test](https://github.com/ehmpathy/rhachet-roles-ehmpathy/workflows/test/badge.svg)
![publish](https://github.com/ehmpathy/rhachet-roles-ehmpathy/workflows/publish/badge.svg)

empathetic software construction roles and skills, via [rhachet](https://github.com/ehmpathy/rhachet)

# purpose

# install

```sh
npm install rhachet-roles-ehmpathy
```

# use

## `readme --registry`
```sh
npx rhachet readme --registry ehmpathy
```

produces

```md
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
```

## `ask -r mechanic`

the mechanic writes code within a repo

### `ask -r mechanic -s upsert`

you can ask the mechanic to upsert the code in a target file or dir
- if it exists, it'll update
- if it doesn't, it'll create


```sh
npx rhachet ask -r mechanic -s upsert -t ./path/to/file.ts "your ask"
```

```sh
npx rhachet ask \
  --role mechanic \
  --skill upsert \
  --target ./path/to/file.ts \
  "your ask"
```

once it's self reviewed, it'll ask you for feedback

```sh
? have notes? (Use arrow keys)
❯ no notes
  yes notes
```

it'll loop until you tell it you have `no notes`
