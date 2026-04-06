# self-review: has-critical-paths-frictionless (r8)

## question: are the critical paths frictionless in practice?

### repros artifact status

no `3.2.distill.repros.experience.*.md` files exist (as documented in r5).

critical paths derived from criteria.blackbox.md instead:

### critical paths from criteria

| path | description |
|------|-------------|
| usecase.1 | WebFetch with keyrack unlocked |
| usecase.2 | WebFetch with keyrack locked |
| usecase.3 | git.commit.push with renamed token |
| usecase.4 | one unlock enables all |

### verification per path

#### usecase.1: WebFetch with keyrack unlocked

**flow:**
1. human runs `rhx keyrack unlock --owner ehmpath --env prep`
2. mechanic runs WebFetch
3. border guard calls keyrack.get()
4. keyrack returns XAI_API_KEY
5. grok inspects content
6. WebFetch proceeds

**friction check:**
- keyrack.get() is async → no user-visible delay
- unlock instructions are clear if locked
- exit code 2 on locked state tells Claude to block

**verdict:** frictionless ✓

#### usecase.2: WebFetch with keyrack locked

**flow:**
1. mechanic runs WebFetch without unlock
2. keyrack.get() returns locked status
3. border guard outputs unlock instructions
4. exit 2 blocks the WebFetch

**friction check:**
- error message now says `keyrack unlock` instead of `ask the human`
- test assertion was fixed in r6 to match
- instructions are actionable

**verdict:** frictionless ✓ (after r6 fix)

#### usecase.3: git.commit.push with renamed token

**flow:**
1. mechanic runs git.commit.push
2. keyrack.get() fetches EHMPATHY_SEATURTLE_GITHUB_TOKEN
3. push proceeds with valid token

**friction check:**
- token name change is transparent to mechanics
- keyrack.yml already declares the renamed token
- no user action required

**verdict:** frictionless ✓

#### usecase.4: one unlock enables all

**flow:**
1. human runs `rhx keyrack unlock --owner ehmpath --env prep`
2. XAI_API_KEY unlocked for border guard
3. EHMPATHY_SEATURTLE_GITHUB_TOKEN unlocked for git.commit.push
4. all skills work

**friction check:**
- single command unlocks all env.prep keys
- no per-skill unlock required
- daemon manages TTL

**verdict:** frictionless ✓

### manual verification

ran integration tests to verify:

```
npm run test:integration -- keyrack.ehmpath
npm run test:integration -- git.commit.push
```

tests passed (documented in r3).

### conclusion

**why it holds:**

1. all four critical paths are smooth
2. error messages are actionable
3. one unlock command enables all keyrack-dependent skills
4. no unexpected errors in integration tests

