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
# 🐢 ehmpathy role registry

this registry defines four core roles used to craft empathetic, evolvable, and maintainable software.

each role is a lens — a way to think about the system — grounded in empathy for both the **people who use the product** and the **engineers who maintain the system**.

all roles maximize:

- clarity over cleverness
- maintainability over magic
- empathy over ego

---

## 🌊 ecologist

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

## 🪷 designer

- **scale**: feature-level, user-experience layer
- **focus**: nudges, guardrails, pit-of-success defaults
- **maximizes**: usability, ergonomics, reliability

used to sculpt workflows and interfaces that feel obvious and safe.

---

## 🐚 mechanic

- **scale**: repo-level, implementation detail
- **focus**: maintainability, observability, readability
- **maximizes**: empathy for the 3am on-call engineer

used to write and revise the actual logic that runs the system.
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

# mascots

this repo houses roles for sea turtles 🐢 — gentle builders of empathetic software, who carefully improve the ecosystems they serve.

they wield:
- 🌊 wave — for ecologists — to understand what flows beneath the surface, fundamentally
- 🪸 coral — for architects — to compose many parts into one structure, evolvably
- 🪷 lotus — for designers — to guide users to the surface, intuitively
- 🐚 shell — for mechanics — to craft code easy to read and hard to break, maintainably
