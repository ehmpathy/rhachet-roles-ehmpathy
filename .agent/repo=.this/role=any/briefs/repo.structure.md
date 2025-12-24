# repo structure: rhachet-roles-ehmpathy

## .what

this repo is the source for `repo=ehmpathy` roles. the briefs and skills you see at runtime come from here.

## .how it works

```
src/domain.roles/
  └── mechanic/
      ├── briefs/      ← source briefs (edit here)
      ├── inits/       ← source init scripts
      └── skills/      ← source skills
          ↓
       npm run build
          ↓
dist/domain.roles/
  └── mechanic/
      ├── briefs/      ← built briefs (read-only)
      ├── inits/       ← built init scripts
      └── skills/      ← built skills
          ↓
       symlinked at runtime
          ↓
.agent/repo=ehmpathy/role=mechanic/
      ├── briefs/      ← what agents see
      ├── inits/
      └── skills/
```

## .key points

1. **edit in `src/`** — all changes to briefs, skills, and inits go in `src/domain.roles/`
2. **build to `dist/`** — run `npm run build` to compile src → dist
3. **runtime links to `dist/`** — `.agent/repo=ehmpathy/` symlinks to `dist/domain.roles/`
4. **this repo = repo=ehmpathy** — when working here, you're editing the ehmpathy role definitions

## .common tasks

- **add/edit a brief**: modify `src/domain.roles/{role}/briefs/...`
- **add/edit a skill**: modify `src/domain.roles/{role}/skills/...`
- **add/edit permissions**: modify `src/domain.roles/{role}/inits/init.claude.permissions.jsonc`
- **test changes**: run `npm run build` then restart claude session
