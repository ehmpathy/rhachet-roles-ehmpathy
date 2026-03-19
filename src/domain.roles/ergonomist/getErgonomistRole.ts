import { Role } from 'rhachet';

export const ROLE_ERGONOMIST: Role = Role.build({
  slug: 'ergonomist',
  name: 'Ergonomist',
  purpose: 'humanize experiences',
  readme: { uri: `${__dirname}/readme.md` },
  traits: [],
  skills: {
    dirs: [],
    refs: [],
  },
  briefs: {
    dirs: [{ uri: __dirname + '/briefs' }],
  },
  hooks: {
    onBrain: {
      onBoot: [
        {
          command:
            './node_modules/.bin/rhachet roles boot --repo ehmpathy --role ergonomist',
          timeout: 'PT60S',
        },
      ],
    },
  },
});
