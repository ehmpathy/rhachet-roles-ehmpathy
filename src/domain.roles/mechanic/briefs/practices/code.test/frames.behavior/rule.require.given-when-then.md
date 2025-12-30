### .tactic = tests:given-when-then

#### .what
use `jest` in combination with `test-fns` to structure tests with `given / when / then` hierarchy

#### .where
- applies to all test suites across core logic and modules
- required for integration tests and expected for unit tests
- recommended for test readability, maintainability, and intent traceability

#### .why
- expresses test intent and flow in human-readable structure
- aligns test structure with natural reason: context → action → result
- improves ability to isolate, debug, and extend test scenarios
- keeps test surface minimal and expressive, especially for high-context logic

#### .how

##### .rules
- use `describe()` to group related logic (e.g., a route or stitcher)
- use `given()` to describe the setup scenario
  - must establish all required input (e.g., files, threads, role context)
- use `when()` to declare the act or trigger
  - should define one clear execution path
- use `then()` to assert outcomes
  - may include async calls, file checks, or output inspection

##### .examples

###### .positive
```ts
import { given, when, then } from 'test-fns';

given('a mechanic with ask, claim, and coderefs', () => {
  const coderef = genArtifactGitFile({ uri: 'file.md' });

  beforeEach(async () => {
    await coderef.set({ content: '...' });
  });

  when('executed', () => {
    const threads = { /* setup threads */ };

    then('updates the claims artifact', async () => {
      const result = await enweaveOneStitcher({ stitcher, threads }, context);
      const content = await claimsArt.get();
      expect(content).toContain('...');
    });

    then('throws on invalid input', async () => {
      const error = await getError(enweaveOneStitcher({ stitcher, threads: {} }, context));
      expect(error).toBeInstanceOf(ThreadMissError)
    });
  });
});
```

```ts
when('executed', async () => {        // ⛔ async not allowed in when()
  const result = await doSomething();
});
```
