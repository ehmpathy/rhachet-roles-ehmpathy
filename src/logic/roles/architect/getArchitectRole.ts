import { Role } from 'rhachet';

export const ROLE_ARCHITECT: Role = Role.build({
  slug: 'architect',
  name: 'Architect',
  purpose: 'design system',
  readme: `
## 🏛️ Architect

- **scale**: system-level, cross-cutting concerns
- **focus**: patterns, principles, maintainability
- **maximizes**: long-term scalability and coherence

Used to design system architecture and establish patterns that ensure maintainability.
  `.trim(),
  traits: [],
  skills: {
    dirs: [],
    refs: [],
  },
  briefs: {
    dirs: [{ uri: __dirname + '/.briefs' }],
  },
});
