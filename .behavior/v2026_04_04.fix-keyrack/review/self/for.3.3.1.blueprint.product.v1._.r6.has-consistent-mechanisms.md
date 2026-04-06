# review r6: has-consistent-mechanisms

review for new mechanisms that duplicate extant functionality.

## new mechanisms in blueprint

### mechanism 1: keyrack SDK call

**blueprint proposes:**
```typescript
const grant = await keyrack.get({
  key: 'XAI_API_KEY',
  owner: 'ehmpath',
  env: 'prep',
});
```

**does extant code use keyrack SDK?**

research document citation [1] shows shell-based keyrack access in keyrack.operations.sh:
```bash
keyrack_output=$(rhachet keyrack get --key X --env Y --json)
```

**is TypeScript SDK usage extant?**

human stated in wish: "rhachet exports a keyrack SDK from 'rhachet/keyrack' that should be used".

this implies SDK exists but may not be widely used yet.

**is this consistent?**

yes. SDK is the canonical way for TypeScript. CLI is for shell. blueprint uses SDK for TypeScript file.

### mechanism 2: unlock instructions error message

**blueprint proposes:**
```typescript
console.error(`🔐 XAI_API_KEY locked\n\nrun: rhx keyrack unlock --owner ehmpath --env prep`);
process.exit(2);
```

**does extant code have similar pattern?**

research document shows git.commit.push.sh has fallback to ehmpath owner unlock:
```
fallback to ehmpath owner unlock
```

vision also references this pattern:
```
🔐 XAI_API_KEY locked

run: rhx keyrack unlock --owner ehmpath --env prep
```

**is this consistent?**

yes. follows extant pattern of actionable error with specific command to run.

### mechanism 3: env var assignment after keyrack fetch

**blueprint proposes:**
```typescript
process.env.XAI_API_KEY = grant.secret;
```

**does extant code set env vars this way?**

in shell (keyrack.operations.sh), env vars are exported after keyrack fetch:
```bash
export EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN="$secret"
```

the TypeScript equivalent is `process.env.X = value`.

**is this consistent?**

yes. same pattern, different language.

### mechanism 4: sedreplace for bulk rename

**blueprint proposes:**
sedreplace across 43 files.

**does extant code use sedreplace?**

yes. sedreplace is an extant skill for bulk replacements.

**is this consistent?**

yes. reuses extant mechanism.

## mechanisms not introduced

### no new error class

blueprint uses `console.error` + `process.exit(2)`. does not introduce a new error class.

could we use HelpfulError? blueprint does not specify. implementation could consider.

**is omission a problem?** no. console.error is sufficient for CLI error output.

### no new wrapper function

blueprint inlines keyrack.get() call. does not create a wrapper like `getXaiApiKey()`.

**is omission a problem?** no. single use case. wrapper would be YAGNI.

## duplication check

| mechanism | extant pattern | consistent? |
|-----------|---------------|-------------|
| keyrack SDK | CLI in shell | yes (SDK for TS) |
| unlock message | git.commit.push | yes |
| env var set | shell export | yes (TS equivalent) |
| sedreplace | skill exists | yes |

## issues found

none. all mechanisms follow extant patterns.

## why this holds

1. **keyrack SDK** — human specified SDK for TypeScript, CLI for shell. consistent with language-appropriate patterns.
2. **unlock message** — follows extant pattern from git.commit.push.
3. **env var set** — standard pattern in both shell and TypeScript.
4. **sedreplace** — reuses extant skill.

no new utilities introduced. no duplication of extant functionality.

## lesson

the blueprint reuses extant mechanisms:
- keyrack SDK (exists in rhachet)
- sedreplace skill (exists in repo)
- error message pattern (exists in git.commit.push)

no new abstractions needed. consistency preserved.
