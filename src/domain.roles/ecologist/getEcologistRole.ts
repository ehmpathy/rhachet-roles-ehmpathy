import { Role } from 'rhachet';

// import { SKILL_ENVISION } from './envision/stepEnvision.skill';

export const ROLE_ECOLOGIST: Role = Role.build({
  slug: 'ecologist',
  name: 'Ecologist',
  purpose: 'write code',
  readme: { uri: `${__dirname}/readme.md` },
  traits: [],
  skills: {
    dirs: [],
    refs: [
      // SKILL_ENVISION_JOURNEY,
      // SKILL_STUDY_DOMAIN,
      // SKILL_DOMAIN_TERM_COLLECT_USECASES,
      // SKILL_DOMAIN_TERM_DISTILL,
    ],
  },
  briefs: {
    dirs: [{ uri: __dirname + '/briefs' }],
  },
});
