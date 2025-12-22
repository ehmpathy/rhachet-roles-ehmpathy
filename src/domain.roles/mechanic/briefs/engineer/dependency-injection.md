## 🧠 `.brief.designer.dependency-injection`

### 🧠 topic: dependency injection
**why we pass in dependencies instead of hardcoding them**

---

### 🎯 goal
build software that is **flexible, testable, and decoupled**,
by making dependencies **explicit, swappable, and controlled from the outside**.

---

### 🛠 what it is

> **dependency injection** = giving a function, class, or module what it needs from the outside,
> rather than letting it construct or look up those tools internally.

for example, instead of having a function reach for its own dependencies:

```ts
// ❌ tightly coupled and side-effect prone
import { log } from '@/utils/logger';
import { getDatabaseConnection } from '@/utils/database';

export const upsert = async ({ cost }: { cost: JobLeadCost }) => {
  log.debug('began.upsert', { cost });
  const dbConnection = await getDatabaseConnection();
  const result = await dbConnection.query('SELECT * FROM ...');
}
```

you inject those dependencies via the standard `(input, context)` pattern:

```ts
// ✅ dependency injection via context
export const upsert = async (
  { cost }: { cost: JobLeadCost },
  context: { dbConnection: DatabaseConnection, log: LogMethods }, // note how the .context pattern cleanly separates inputs from dependencies
) => {
  context.log.debug("began.upsert", { cost });
  const updated = await context.dbConnection.query('SELECT * FROM ...');
  await emitJobLeadCostSetEvent(result, context); // note how easy it is to reuse dependencies via the context pattern
  return updated;
};
```

- the function doesn’t reach into globals or construct its own tools
- everything it needs is **passed in from the outside**, making it testable, predictable, and side-effect free

---

### 🔑 paved pattern: `(input, context)`
dependency injection is best done by following the **standard procedure contract**:

```ts
export const doThing = async (
  input: SomeInput,
  context: { db: Db; log: Logger } & OtherContext
) => { ... }
```

- all dependencies go in the `context` argument
- keeps `input` clean, and `context` flexible
- enables composition, tracing, and full test control


---

### 🤝 why it matters

- **testability** — swap real dependencies with mocks/fakes
- **flexibility** — easily change implementations without changing core logic
- **separation of concerns** — business logic doesn't manage its own plumbing
- **explicitness** — makes system wiring visible and intentional
- **reusability** — same logic can be reused with different behaviors

---

### 🧱 core principle

> **don’t make decisions deep inside the system.**
> instead, **let the outer layers decide what gets injected**.

you keep **policies and tools separate from behaviors**.

---

### 🔍 mental model

> dependency injection is like **plugging in a tool** instead of **building one every time**.

your procedures say:
> “give me what I need — I don’t care where it came from.”

---

### 🔄 practical benefits

| without DI                             | with DI                                    |
|----------------------------------------|--------------------------------------------|
| hardcoded database inside procedures   | database passed in as via parameters       |
| requires real API in tests             | can inject mock/fake API for testing       |
| logic tied to concrete tools           | logic works with any compatible tool       |
| hard to switch infra/tools             | swappable with config or environment setup |

---

### 🧩 final synthesis

we inject dependencies to build systems that are easier to **test**, **scale**, and **evolve**.

> dependency injection is about building **pure, decoupled, and testable** systems.
> it eliminates shared state, surfaces side effects, and makes your logic portable and composable.
> it enables **modularity**, **testability**, and **control**,
> by making **dependencies external** instead of hidden inside.

done right, it's **invisible during use**, and **invaluable during testing, scaling, and evolution**.
