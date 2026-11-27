# rule.forbid.term=staging.example=demo

a 👎/👍 demo for `rule.forbid.term=staging`.

**👎 bad**
```yaml
environments:
  - test
  - staging
  - prod
```

```ts
// deploy the swell api to staging before release
```

**👍 good**
```yaml
environments:
  - test
  - prep
  - prod
```

```ts
// deploy the swell api to prep before release
```
