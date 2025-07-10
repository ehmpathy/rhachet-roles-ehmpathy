🧩 product spec: rhachet CLI
✅ purpose
a lightweight CLI entrypoint to:

list available roles/skills with readable descriptions

invoke a role+skill combo against a target and ask

🗂️ project layout
```bash
/src
  /cli
    index.ts                // CLI entrypoint
    commands/
      listRoles.ts
      invokeSkill.ts
  /core
    roles/                  // where roles/skills are registered
    logic/
      runSkill.ts           // generic procedure runner
README.md
package.json
tsconfig.json
```


🧾 command interface
1. list mode
```sh
npx rhachet list            # lists roles and their available skills
npx rhachet list --role mechanic   # show only mechanic's skills
```

2. invoke mode
``sh
npx rhachet \
  --role mechanic \
  --skill produce \
  --target target/file/path \
  --ask "the ask to execute"
```

shorthand alias:
```sh
npx rhachet -r mechanic -s produce -t target/file/path -a "the ask"
```

🔧 CLI design
use yargs or commander for argument parsing.

`index.ts`
```ts
#!/usr/bin/env node
import { runCLI } from './commands';

runCLI(); // parses args and routes to proper subcommand
```

`commands/runCLI.ts`
```ts
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { listRoles } from './listRoles';
import { invokeSkill } from './invokeSkill';

export const runCLI = () => {
  yargs(hideBin(process.argv))
    .command('list', 'list roles and skills', (yargs) => {
      return yargs.option('role', { type: 'string' });
    }, async (argv) => {
      await listRoles(argv.role);
    })

    .command('*', 'default: invoke role+skill', (yargs) => {
      return yargs
        .option('role', { alias: 'r', demandOption: true, type: 'string' })
        .option('skill', { alias: 's', demandOption: true, type: 'string' })
        .option('target', { alias: 't', type: 'string' })
        .option('ask', { alias: 'a', type: 'string' });
    }, async (argv) => {
      await invokeSkill(argv);
    })

    .strict()
    .help()
    .parse();
};
```


🧠 skill/role registry

```ts
// /core/roles/index.ts
export const roleRegistry = {
  mechanic: {
    skills: {
      produce: {
        description: 'write the output of mechanic work',
        run: async ({ target, ask }) => {
          return await runSkill({ role: 'mechanic', skill: 'produce', target, ask });
        },
      },
    },
    readme: 'mechanic role builds things from specs',
  },

  critic: {
    skills: {
      review: { /*...*/ },
    },
    readme: 'critic role evaluates proposals or artifacts',
  },
};
```


✨ bonus features
--dry-run to preview what will be executed

--log-level debug for verbose output

colorized terminal output (e.g., chalk)

include role/skill README text in list output

