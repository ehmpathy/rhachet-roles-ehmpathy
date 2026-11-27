# rule.forbid.term=script.example=demo

a 👎/👍 demo for `rule.forbid.term=script`.

**👎 bad**
```
scripts/
  deploy-script.sh
  cleanup-script.js
  data-script.ts
```

```ts
// run the script to fix the data
const runScript = () => { ... };
```

**👍 good**
```
commands/
  deploy.sh
  cleanup.command.ts
migrations/
  2024-01-fix-user-data.ts
```

```ts
// run the migration to fix the data
const runMigration = () => { ... };

// invoke the command to deploy
const invokeDeployCommand = () => { ... };
```
