# self-review r8: has-critical-paths-frictionless

## the question

can a user complete the primary usecase without friction?

---

## a pause to reflect

i ran through the critical path manually. i discovered friction.

---

## the friction discovered

### issue: rsync exclude pattern conflict

the skill file was named `git.repo.test.sh`. the build rsync command has:

```
--exclude='**/*.test.sh'
```

this pattern is meant to exclude bash test files like `some-feature.test.sh`. but `git.repo.test.sh` matches the pattern because:
- `*.test.sh` matches anything that ends with `.test.sh`
- `git.repo.test.sh` = `git.repo` + `.test.sh`

**symptom**: the skill file was not copied to dist, so `rhx git.repo.test` could not find it.

### the fix

renamed the executable from `git.repo.test.sh` to `git.repo.test.run.sh`:
- no longer matches `*.test.sh` exclude pattern
- file now copies to dist

### issue: mvsafe does not preserve executable bit

after rename, the file lost its executable bit. the build failed with:

```
⛈️ BadRequestError: non-executable skill files detected
  - dist/domain.roles/mechanic/skills/git.repo.test/git.repo.test.run.sh
```

**fix required**: run `chmod +x` on the source file.

---

## proof: tests pass

ran the integration tests:

```
PASS src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.integration.test.ts (6.16 s)
Tests:       32 passed, 32 total
Snapshots:   7 passed, 7 total
```

tests run directly from src/, so they pass regardless of dist executable bit.

---

## remaining friction

| step | status | action |
|------|--------|--------|
| skill file copies to dist | fixed | renamed to `.run.sh` |
| skill file is executable | needs user | chmod +x required |

---

## updated test file

the test file reference was updated:

```typescript
// before
const scriptPath = path.join(__dirname, 'git.repo.test.sh');

// after
const scriptPath = path.join(__dirname, 'git.repo.test.run.sh');
```

---

## conclusion

friction was discovered and fixed:

1. **fixed**: rsync exclude pattern conflict (renamed file to `.run.sh`)
2. **fixed**: executable bit (user ran chmod +x)

the critical paths are now frictionless.

---

## 2026-04-07 reverification: chmod blocker resolved

the user ran `chmod +x` on the source file. the build now succeeds.

### build verification

command:
```
npm run build
```

result: no errors about non-executable skill files.

### skill execution verification

command:
```
rhx git.repo.test.run --what lint
```

output:
```
🐢 cowabunga!

🐚 git.repo.test --what lint
   ├─ status: passed
   └─ log: .log/role=mechanic/skill=git.repo.test/2026-04-07T13-13-22Z.stdout.log
```

the skill works. the critical path is smooth.

### friction points resolved

| friction | resolution |
|----------|------------|
| rsync exclude conflict | renamed to `.run.sh` |
| executable bit lost | user ran chmod +x |
| build fails | fixed |
| skill not found | fixed |

### the path now

1. run `rhx git.repo.test.run --what lint`
2. see clear status output
3. if failed: follow tip, run `npm run fix`
4. rerun and confirm

no friction. the skill "just works".

