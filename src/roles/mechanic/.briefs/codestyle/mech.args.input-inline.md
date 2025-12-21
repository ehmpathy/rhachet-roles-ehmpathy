# 🧩 .brief: `args:inline-input`

## .what
**`args:inline-input`** is a declaration style for function arguments where the primary argument is a **single `input` object** with **inline type annotations**.

\`\`\`ts
export const doSomething = (input: { foo: string; bar: number }): void => {
  // ...
};
\`\`\`

- **inline types**: the shape of `input` is declared directly at the point of use, not as a separate named type (unless truly reused across contexts).
- **non-destructured**: `input` remains intact in the parameter list.

---

## .why
this pattern maximizes **maintainability** and **readability** by:

1. **keeping type info local**
   - no need to jump to another file or scroll to find the interface/type definition.
   - changes to argument structure are quick and visible in one place.

2. **reinforcing origin clarity**
   - variables from `input` are always referenced as `input.foo` or `input.bar`, making their provenance explicit.
   - this avoids ambiguity in larger scopes, especially when a function mixes locals, constants, and context values.

3. **avoiding premature fragmentation**
   - not all shapes deserve a named type. we only extract to `type` or `interface` when the same shape is reused across multiple functions or modules.

---

## 📏 rules
- declare the first parameter as `(input: { ... })` with inline types by default.
- destructuring is allowed **inside** the function body, never in the parameter list.
- optional `context` parameter follows the same pattern `(context?: { ... })` and is always second.
- if the type is reused in 3+ places, extract to a named `type` but keep the `input` wrapper.

---

## ✅ example

\`\`\`ts
export const sendEmail = (
  input: { to: string; subject: string; body: string },
  context?: { retries?: number }
): Promise<void> => {
  const { to, subject, body } = input;
  // ...
};
\`\`\`

---

## ❌ anti-pattern

\`\`\`ts
// ❌ loses "input" provenance
export const sendEmail = ({ to, subject, body }: { to: string; subject: string; body: string }) => {};

// ❌ type drift — must look up the type definition elsewhere for basic usage
export const sendEmail = (input: EmailInput) => {};
\`\`\`
