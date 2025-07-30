import { Role } from 'rhachet';

// import { SKILL_ENVISION } from './envision/stepEnvision.skill';

export const ROLE_ECOLOGIST = Role.build({
  slug: 'ecologist',
  name: 'Ecologist',
  purpose: 'write code',
  readme: `

## 🌱 Ecologist

- **scale**: domain fundamentals, real-world systems
- **focus**: what changes, what flows, what matters — ignoring software
- **maximizes**: fidelity to the real world

Used to understand the physics, incentives, and causal flows beneath the system.

  `.trim(),
  traits: [],
  skills: [
    // SKILL_ENVISION_JOURNEY,
    // SKILL_STUDY_DOMAIN,
    // SKILL_DOMAIN_TERM_COLLECT_USECASES,
    // SKILL_DOMAIN_TERM_DISTILL,
  ],
});
