### .rule = require-explicit-return-types

#### .what
all exported functions must have explicit return type annotations

#### .why
- enables compile-time verification of function contracts
- prevents accidental return type drift in refactors
- improves IDE autocomplete and documentation
- makes function signatures self-documented

#### .scope
- applies to all exported functions in production code
- applies to all async functions (must specify `Promise<T>`)
- exempt: private helpers under 3 lines with obvious returns

#### .how

##### 👍 required
- every exported function must declare its return type
- async functions must use `Promise<ReturnType>`
- void functions must explicitly return `void`

##### 👎 forbidden
- implicit return types on exports
- `any` as a return type (use `unknown` if truly dynamic)
- return type that differs from actual returns

#### .examples

##### 👍 positive
```ts
export const getUser = async (input: { id: string }): Promise<User | null> => {
  return userDao.findById(input.id);
};

export const validateInput = (input: { data: unknown }): boolean => {
  return schema.isValid(input.data);
};
```

##### 👎 negative
```ts
// 👎 no return type
export const getUser = async (input: { id: string }) => {
  return userDao.findById(input.id);
};

// 👎 any return type
export const parseData = (raw: string): any => {
  return JSON.parse(raw);
};
```

#### .enforcement
- implicit return types on exports = **BLOCKER**
- `any` return type = **BLOCKER**
