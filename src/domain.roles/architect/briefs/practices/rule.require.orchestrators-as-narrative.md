# rule.require.orchestrators-as-narrative

## .what

orchestrators must read as narrative — each line tells *what* happens, not *how*.

## .why

- humans and robots spend read-time in orchestrators
- decode-friction forces readers to simulate implementation
- named operations let readers grasp intent immediately
- readability abstraction pays dividends on every read

## .pattern

orchestrators should read like prose:

```ts
const setUserNotifications = async (input: { users: User[], user: User }, context: Context) => {
  // each line tells WHAT, not HOW
  const emails = getAllActiveUserEmails({ users: input.users });
  const canAccess = isEligibleForPremiumFeatures({ user: input.user });

  if (canAccess) await context.sdkEmail.sendBulk({ to: emails, subject: 'Update' });
  return { sent: canAccess ? emails.length : 0 };
};
```

not like machine code:

```ts
const setUserNotifications = async (input: { users: User[], user: User }, context: Context) => {
  // requires decode to understand
  const emails = input.users
    .filter(u => u.status === 'active' && u.emailVerified)
    .map(u => u.email.toLowerCase())
    .sort();
  const canAccess = input.user.age >= 18 && input.user.verified && !input.user.suspended && input.user.subscription !== 'free';

  if (canAccess) await context.sdkEmail.sendBulk({ to: emails, subject: 'Update' });
  return { sent: canAccess ? emails.length : 0 };
};
```

## .enforcement

orchestrator with decode-friction = blocker

## .see also

- `define.domain-operation-grains` — transformers, communicators, orchestrators
- `rule.forbid.decode-friction-in-orchestrators` — what to avoid
- `philosophy.transformer-orchestrator-separation.[philosophy]` — the metaphors
