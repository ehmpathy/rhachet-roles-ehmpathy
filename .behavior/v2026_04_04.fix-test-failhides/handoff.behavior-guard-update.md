# handoff: behavior guard rule update

## .what

behavior guards on 5.1.execution and 3.3.1.blueprint need to include code.test failhide rules.

## .current

```sh
npx rhachet run --repo bhrain --skill review \
  --rules '.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/pitofsuccess.errors/rule.*.md' \
  ...
```

## .proposed

```sh
npx rhachet run --repo bhrain --skill review \
  --rules '.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.{prod,test}/pitofsuccess.errors/rule.*.md' \
  ...
```

## .files to update

- stone guards that run failhide review in behavior routes
- specifically: guards with `--rules` patterns that target `code.prod/pitofsuccess.errors/`
