# rule.require.commit-scopes

## .what

every commit must include a scope: `type(scope): message`

## .why

- scopes locate the change (which module, feature, or domain)
- changelogs group by scope
- reviewers scan faster

## .pattern

```
type(scope): description

- detail 1
- detail 2
```

## .examples

```bash
# good
fix(invoice): handle negative line items
feat(auth): add oauth provider
chore(deps): bump typescript to 5.4

# bad — no scope
fix: handle negative line items
feat: add oauth provider
```

## .enforcement

commit without scope = blocker
