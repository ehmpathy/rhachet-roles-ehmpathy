# 🧩 distilisys diagram — rhachet CLI design

---

## 📦 [resources]

- [role] — a domain-defined capability category (e.g., mechanic, critic)
- [skill] — an executable function associated with a role
- [ask] — a user-provided prompt that drives the invocation
- [artifact] — a reference to a file, implemented as `Artifact<typeof GitFile>`
- [registry] — a catalog of role definitions and their skill runners
- [invocation] — a runtime execution request of a skill
- [result] — the output or side-effect of a completed invocation
- [cliArgs] — structured input parsed from terminal commands

---

## ⚙️ <mechanisms>

- <defineRoleTypes> — declare the domain structure of Role and Skill
- <buildRegistry> — statically define roles, skills, and associated `run()` logic
- <runSkill> — orchestrate role+skill execution using the registry
- <listRoles> — render available roles and their skills in the CLI
- <invokeSkillCommand> — parse args and initiate invocation
- <runCLI> — central router to handle CLI dispatch via `yargs`
- <packageCLI> — expose CLI via `npx rhachet`

---

## 🌪 {drivers}

### tailwinds
- {clean architecture} — top-down directional layering keeps the system modular and testable
- {internal extensibility} — teams can add new skills without changing CLI logic
- {npx accessibility} — enables zero-install usage and testing

### headwinds
- {hardcoded registry} — lacks dynamic discovery or plugin support
- {error surface} — uncaught input mismatches or unresolved skills may confuse CLI users
- {layer enforcement} — directional boundaries must be vigilantly maintained

---

## 🔁 system flow

### 🧵 invocation path
[cliArgs]
  → <runCLI>
    → <invokeSkillCommand>
      → <runSkill>
        → [invocation]
          → [result]

### 📋 list path
[cliArgs]
  → <runCLI>
    → <listRoles>
      → [registry]
        → [role], [skill]

---

## 🏗️ layer alignment

- `domain/` → [role], [skill], [artifact]  ← <defineRoleTypes>
- `logic/` → [registry], [invocation], [result] ← <buildRegistry>, <runSkill>
- `contract/` → [cliArgs] ← <listRoles>, <invokeSkillCommand>, <runCLI>
- `root` → <packageCLI>
