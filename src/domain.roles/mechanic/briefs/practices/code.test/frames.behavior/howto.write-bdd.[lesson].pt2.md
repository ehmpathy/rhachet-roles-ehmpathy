# how to write bdd-style acceptance tests

## structure

use `given`, `when`, `then` from `test-fns` to structure tests:

```ts
import { given, when, then, useBeforeAll } from 'test-fns';

describe('featureName', () => {
  given('[case1] scenario description', () => {
    when('[t0] before any changes', () => {
      then('precondition holds', async () => { ... });
      then('another precondition holds', async () => { ... });
    });

    when('[t1] target operation is executed', () => {
      then('expected outcome', async () => { ... });
    });

    when('[t2] alternate operation is executed', () => {
      then('alternate outcome', async () => { ... });
    });
  });
});
```

---

## labels

### `[caseN]` for given blocks

each `given` block should have a unique case label:

```ts
given('[case1] valid inputs', () => { ... });
given('[case2] invalid inputs', () => { ... });
given('[case3] edge case scenario', () => { ... });
```

### `[tN]` for when blocks

each `when` block should have a time index label:

- `[t0]` = precondition checks / before any changes
- `[t1]` = first target operation
- `[t2]` = second target operation
- etc.

```ts
given('[case1] prose-author example repo', () => {
  when('[t0] before any changes', () => {
    then('rules glob matches 2 files', ...);
    then('chapters glob matches 3 files', ...);
  });

  when('[t1] stepReview on clean chapter', () => {
    then('review contains no blockers', ...);
  });

  when('[t2] stepReview on dirty chapter', () => {
    then('review contains blockers', ...);
  });
});
```

---

## principles

### consolidate related tests

don't split related scenarios across multiple `given` blocks:

```ts
// ❌ bad - fragmented
given('[case8] prose-author rule enumeration', () => { ... });
given('[case9] prose-author chapter enumeration', () => { ... });
given('[case10] prose-author review works', () => { ... });

// ✅ good - consolidated
given('[case8] prose-author example repo', () => {
  when('[t0] before any changes', () => {
    then('rules glob matches', ...);
    then('chapters glob matches', ...);
  });
  when('[t1] stepReview on clean chapter', () => { ... });
  when('[t2] stepReview on dirty chapter', () => { ... });
});
```

### when describes state/time, not action

```ts
// ❌ bad - describes action
when('[t0] assets are checked', () => { ... });

// ✅ good - describes state/time
when('[t0] before any changes', () => { ... });
```

### use afterEach for cleanup

```ts
// ❌ bad - inline cleanup
then('creates output file', async () => {
  const result = await doThing();
  await fs.rm(outputPath); // cleanup inside then
  expect(result).toBeDefined();
});

// ✅ good - afterEach cleanup
when('[t1] operation runs', () => {
  const outputPath = path.join(os.tmpdir(), 'output.md');
  afterEach(async () => fs.rm(outputPath, { force: true }));

  then('creates output file', async () => {
    const result = await doThing();
    expect(result).toBeDefined();
  });
});
```

### preconditions shouldn't expect errors

```ts
// ❌ bad - precondition expects error then checks it's not a validation error
then('does not throw validation errors', async () => {
  const error = await getError(doThing());
  expect(error.message).not.toContain('validation');
});

// ✅ good - precondition checks assets directly
then('rules glob matches 2 files', async () => {
  const files = await enumFiles({ glob: 'rules/*.md' });
  expect(files).toHaveLength(2);
});
```

### use useBeforeAll for shared setup

```ts
given('[case1] scenario with shared setup', () => {
  const scene = useBeforeAll(async () => {
    const entity = await createEntity();
    return { entity };
  });

  when('[t1] operation runs', () => {
    then('uses shared entity', async () => {
      const result = await doThing({ id: scene.entity.id });
      expect(result).toBeDefined();
    });
  });
});
```

---

## complete example

```ts
import { given, when, then, useBeforeAll } from 'test-fns';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('stepReview', () => {
  given('[case1] prose-author example repo', () => {
    when('[t0] before any changes', () => {
      then('rules glob matches 2 prose style rules', async () => {
        const ruleFiles = await enumFilesFromGlob({
          glob: '.agent/**/rules/*.md',
          cwd: ASSETS_PROSE,
        });
        expect(ruleFiles).toHaveLength(2);
      });

      then('chapters glob matches 3 chapters', async () => {
        const chapterFiles = await enumFilesFromGlob({
          glob: 'chapters/*.md',
          cwd: ASSETS_PROSE,
        });
        expect(chapterFiles).toHaveLength(3);
      });
    });

    when('[t1] stepReview on chapter2.fixed.md', () => {
      const outputPath = path.join(os.tmpdir(), 'review-fixed.md');
      afterEach(async () => fs.rm(outputPath, { force: true }));

      then('review contains no blockers', async () => {
        const result = await stepReview({
          rules: '.agent/**/rules/*.md',
          paths: 'chapters/chapter2.fixed.md',
          output: outputPath,
          mode: 'hard',
          cwd: ASSETS_PROSE,
        });
        expect(result.review.formatted.toLowerCase()).not.toContain('blocker');
      });
    });

    when('[t2] stepReview on chapter2.md', () => {
      const outputPath = path.join(os.tmpdir(), 'review-unfixed.md');
      afterEach(async () => fs.rm(outputPath, { force: true }));

      then('review contains blockers for gerund violations', async () => {
        const result = await stepReview({
          rules: '.agent/**/rules/*.md',
          paths: 'chapters/chapter2.md',
          output: outputPath,
          mode: 'hard',
          cwd: ASSETS_PROSE,
        });
        expect(result.review.formatted.toLowerCase()).toContain('blocker');
      });
    });
  });
});
```
