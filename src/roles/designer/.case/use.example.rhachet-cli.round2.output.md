# 🧭 `rhachet` CLI — directional-arch compliant design

## 🧩 purpose
expose internal role+skill procedures via CLI with:
- `list` command to explore roles and skills
- default command to invoke skill on target+ask

---

## 📁 directory structure (`arch:directional-deps` compliant)

```sh
src/
  contract/
    commands/             # CLI entrypoint lives here
      rhachet/
        runCLI.ts         # yargs CLI router
        invokeSkill.ts    # top-level command entrypoint
        listRoles.ts      # top-level list command
    endpoints/            # (optional) HTTP or external APIs
  logic/                  # skill orchestration lives here
    runSkill.ts           # generic skill executor (role+skill)
  data/
    daos/                 # if roles/skills persist data
    sdks/                 # if they call external services
  domain/
    objects/
      Role.ts             # canonical role/skill types
      Target.ts           # domain representation of a target
```

---

## 🚦 dependency flow

| layer      | can depend on             | cannot depend on            |
| ---------- | ------------------------- | --------------------------- |
| `contract` | `logic`, `data`, `domain` | anything outside `/src`     |
| `logic`    | `data`, `domain`          | `contract`                  |
| `data`     | `domain`                  | `logic`, `contract`         |
| `domain`   | (self-contained only)     | `data`, `logic`, `contract` |

---

## 🔧 CLI interface

```sh
npx rhachet list                  # lists all roles and skills
npx rhachet list --role critic    # lists skills of a single role

npx rhachet -r mechanic -s produce \
  -t ./some/path.ts \
  -a "create a getWeather endpoint"
```

---

## 🧠 role registry (in domain/objects/Role.ts)

```ts
export type Skill = {
  slug: string;
  description: string;
};

export type Role = {
  slug: string;
  readme: string;
  skills: Record<string, Skill>;
};
```

---

## ⚙️ skill invocation (top-down)

`contract/commands/rhachet/invokeSkill.ts`
  ```ts
  import { runSkill } from '@/logic/runSkill';

  export const invokeSkill = async ({
    role,
    skill,
    target,
    ask,
  }: {
    role: string;
    skill: string;
    target?: string;
    ask?: string;
  }) => {
    await runSkill({ role, skill, target, ask });
  };
  ```

`logic/runSkill.ts`
  ```ts
  import { Role } from '@/domain/objects/Role';

  export const runSkill = async ({
    role,
    skill,
    target,
    ask,
  }: {
    role: string;
    skill: string;
    target?: string;
    ask?: string;
  }) => {
    const fn = getSkillRunner({ role, skill }); // this could resolve to a stitched route
    await fn({ target, ask });
  };
  ```

---

## 📜 command router: runCLI.ts

```ts
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { listRoles } from './listRoles';
import { invokeSkill } from './invokeSkill';

export const runCLI = () => {
  yargs(hideBin(process.argv))
    .command('list', 'list available roles and skills', (y) =>
      y.option('role', { type: 'string', describe: 'limit to specific role' })
    , async (argv) => {
      await listRoles(argv.role);
    })
    .command('*', 'invoke a skill', (y) =>
      y
        .option('role', { alias: 'r', demandOption: true, type: 'string' })
        .option('skill', { alias: 's', demandOption: true, type: 'string' })
        .option('target', { alias: 't', type: 'string' })
        .option('ask', { alias: 'a', type: 'string' })
    , async (argv) => {
      await invokeSkill(argv);
    })
    .strict()
    .help()
    .parse();
};
```

✅ directional architecture guardrails
all orchestration flows (invokeSkill, runSkill) live top-down

domain types (Role, Skill, Target) are pure declarations

future additions like dispatchFlow, runArtifactSkill, or traceSkillTrail go in logic/ only

