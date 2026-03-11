# howto: register a role boot hook

## .what

to boot briefs and skills at session start, a role needs three things:
1. a `boot.yml` file that defines what to boot
2. a `boot` property in `getRole.ts` that points to the boot.yml
3. a hook registration in `getRole.ts` that triggers the boot command

## .why

- `boot.yml` defines which briefs to load and how (say vs ref)
- `boot` property tells rhachet where to find the boot.yml
- hook registration triggers the boot command at session start

**without boot.yml, all briefs get said** — this bloats context. boot.yml narrows to only what's needed.

## .how

### 1. create boot.yml

```yaml
always:
  briefs:
    say:
      # briefs under "say" are loaded into context (agent sees full content)
      - briefs/practices/my-important-brief.md
      - briefs/practices/another-critical-brief.md

    ref:
      # briefs under "ref" are referenced only (agent knows they exist)
      - briefs/practices/supplemental-info.md
      - briefs/practices/detailed-examples.md
```

**say vs ref:**
- `say` — brief content is injected into the session context; agent sees it
- `ref` — brief is indexed but not injected; agent can look it up if needed

use `say` for critical rules and patterns. use `ref` for supplements, examples, and detailed references.

### 2. register both boot property and hook in getRole.ts

```ts
export const ROLE_EXAMPLE: Role = Role.build({
  slug: 'example',
  name: 'Example',
  purpose: 'do stuff',
  readme: { uri: `${__dirname}/readme.md` },
  boot: { uri: `${__dirname}/boot.yml` },  // points to boot.yml
  briefs: {
    dirs: [{ uri: __dirname + '/briefs' }],
  },
  hooks: {
    onBrain: {
      onBoot: [
        {
          command:
            './node_modules/.bin/rhachet roles boot --repo ehmpathy --role example',
          timeout: 'PT60S',
        },
      ],
    },
  },
});
```

### 3. verify

after `npm run build` and reinit, session start should show:

```
SessionStart:startup hook success: <stats>
quant
  ├── files = N
  │   ├── briefs = X
  │   └── skills = Y
```

## .common mistakes

1. create boot.yml but forget to register the hook — boot command never runs
2. register hook but forget boot property — rhachet can't find boot.yml
3. put all briefs under `say` — bloats context; use `ref` for supplements

## .see also

- `src/domain.roles/mechanic/getMechanicRole.ts` — full example with multiple hooks
- `src/domain.roles/architect/getArchitectRole.ts` — minimal example
- `src/domain.roles/mechanic/boot.yml` — example boot.yml with say and ref sections
