# self-review: has-play-test-convention

review of journey test file name convention for git.repo.test experience reproductions.

---

## the convention

journey test files should use `.play.test.ts` suffix:
- `feature.play.test.ts` — journey test
- `feature.play.integration.test.ts` — if repo requires integration runner
- `feature.play.acceptance.test.ts` — if repo requires acceptance runner

this distinguishes journey tests (step-by-step user experience tests) from:
- unit tests (`.test.ts`)
- integration tests (`.integration.test.ts`)

---

## examination of distill document

the distill document (3.2.distill.repros.experience._.v1.i1.md) proposes a test sketch:

```typescript
const runGitRepoTest = (args: {
  packageJson?: object;
  testFiles?: Record<string, string>;
  gitRepoTestArgs: string[];
}): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
  const tempDir = genTempDir({ slug: 'git-repo-test', git: true });
  // ...
};
```

the document describes 9 journeys but does not explicitly name the test file.

**question**: what should the test file be named?

**examination**:

1. **test runner context**: the journeys test a shell skill (`git.repo.test.sh`). they use `genTempDir` to create fixture repos and `spawnSync` to run the skill. this is integration-level test—it spawns real processes and touches the filesystem.

2. **repo convention**: this repo (rhachet-roles-ehmpathy) runs tests via:
   - `npm run test:unit` — `.test.ts` files
   - `npm run test:integration` — `.integration.test.ts` files
   - `npm run test:acceptance` — `.acceptance.test.ts` files

3. **play test distinction**: the `.play.test.ts` suffix indicates journey tests that follow given/when/then structure with multiple steps. the journeys in the distill document are exactly this—step-by-step experience reproductions.

4. **runner compatibility**: does this repo support `.play.test.ts` directly? likely not—the jest config probably matches `*.test.ts`, `*.integration.test.ts`, and `*.acceptance.test.ts`. a `.play.test.ts` file might not be picked up.

**conclusion**: the test file should be named:
- `git.repo.test.play.integration.test.ts`

this:
- marks it as a play/journey test (`.play.`)
- marks it as integration-level (`.integration.`)
- ensures jest picks it up (`*.integration.test.ts`)

---

## issue found and fixed

the distill document did not specify the test file name. this was a gap.

**fix applied**: added "test file" section to the distill document (3.2.distill.repros.experience._.v1.i1.md):

```markdown
### test file

the journey tests should be in:
- `src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.play.integration.test.ts`

this follows the `.play.integration.test.ts` convention:
- `.play.` — marks it as a journey test (step-by-step experience test)
- `.integration.` — marks it as integration-level (spawns processes, touches filesystem)
- `.test.ts` — ensures jest picks it up
```

**why this file name**:
1. `git.repo.test` — matches skill name
2. `.play.` — signals journey/experience test nature
3. `.integration.` — ensures jest integration runner picks it up (this repo requires runner-specific suffix)
4. collocated in `skills/git.repo.test/` — near the skill it tests

---

## why `.play.integration.test.ts` and not just `.integration.test.ts`

the `.play.` infix serves documentation purpose:

1. **signal to reader**: "this is a journey test, not a narrow integration test"
2. **future tools**: could filter `.play.` tests for different treatment
3. **mental model**: aligns with the distill document's "journey" terminology

without `.play.`, the test file would be `git.repo.test.integration.test.ts` which doesn't signal the journey/experience nature.

---

## verification of other aspects

### test location — why it holds

the distill document implies tests are near the skill. the test sketch references `skillPath` without definition:

```typescript
const result = spawnSync('bash', [skillPath, ...args.gitRepoTestArgs], {
  cwd: tempDir,
  ...
});
```

**why this holds**:

1. **collocation pattern**: ehmpathy repo convention collocates tests with the code they test. the skill is at `skills/git.repo.test/git.repo.test.sh`, so the test belongs at `skills/git.repo.test/git.repo.test.play.integration.test.ts`.

2. **`skillPath` resolution**: the natural definition is `path.join(__dirname, 'git.repo.test.sh')` which works because test and skill share the same directory.

3. **alternative locations rejected**:
   - `__tests__/git.repo.test.play.integration.test.ts` — separates test from skill, breaks `__dirname` resolution
   - `src/test/git.repo.test.play.integration.test.ts` — centralizes tests, but this repo doesn't use that pattern

**conclusion**: collocation holds. the fix I applied to distill document explicitly specifies the full path `src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.play.integration.test.ts` which encodes this collocation.

### journey structure — why it holds

each journey in the distill document follows the pattern:

```
given('[caseN] scenario description')
  when('[tN] action description')
    then('expected outcome')
```

**why this holds**:

1. **case label convention**: `[case1]`, `[case2]`, etc. uniquely identify each scenario. journey 1-9 use this pattern consistently. this enables filtering tests by case: `--scope case1`.

2. **step label convention**: `[t0]`, `[t1]`, etc. uniquely identify steps within a scenario. all journeys use `[t0]` because they're single-step scenarios. multi-step scenarios would use `[t0]`, `[t1]`, `[t2]`.

3. **given/when/then alignment**: the distill document uses pseudo-code:
   ```
   given('[case1] repo with test:unit command and 3 tests that pass')
     when('[t0] rhx git.repo.test --what unit is run')
       then('exit code is 0')
   ```
   this maps directly to test-fns:
   ```typescript
   given('[case1] repo with test:unit command and 3 tests that pass', () => {
     when('[t0] rhx git.repo.test --what unit is run', () => {
       then('exit code is 0', () => { ... });
     });
   });
   ```

4. **snapshot target alignment**: each journey specifies a "snapshot target" which becomes the `expect(...).toMatchSnapshot()` assertion. journey 1 shows:
   ```
   🐢 cowabunga!
   🐚 git.repo.test --what unit
   ...
   ```
   this exact output should be captured in the snapshot file.

**conclusion**: journey structure holds. the distill document's pseudo-code format maps cleanly to test-fns given/when/then with proper labels.

---

## lesson learned

the distill document focused on what to test (9 journeys) and how to test (genTempDir, spawnSync) but omitted where to test (file name and location).

**why this matters**: without explicit file name:
- mechanic might create `git.repo.test.test.ts` (wrong runner)
- mechanic might create `git.repo.test.integration.test.ts` (no play signal)
- blueprint would have to specify what distill should have

**the fix was surgical**: one new section added to distill, specifying:
- exact file path: `src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.play.integration.test.ts`
- rationale for each part of the name

**pattern to remember**: experience reproduction plans should specify:
1. what to test (journeys)
2. how to test (utilities, setup)
3. where to test (file name, location)

---

## summary

| aspect | status | notes |
|--------|--------|-------|
| test file name | fixed | added to distill: `git.repo.test.play.integration.test.ts` |
| test location | holds | collocation with skill in `skills/git.repo.test/` |
| journey structure | holds | given/when/then matches play convention |

**issue found**: test file name not specified in distill document.

**fix applied**: added "test file" section to 3.2.distill.repros.experience._.v1.i1.md with exact path and rationale.

**verification**: test file name now explicit; location and structure were already correct.
