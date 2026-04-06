# review: has-questioned-requirements

## requirement 1: add XAI_API_KEY to keyrack.yml

**who said this?** human, in this session

**evidence:** border guard fails without XAI_API_KEY. keyrack.yml doesn't list it. this creates a hidden dependency.

**what if we didn't?** mechanics would continue to need `~/.config/rhachet/apikeys.env` — a path not documented anywhere in keyrack.yml. inconsistent with how other keys are managed.

**verdict:** holds. keyrack.yml should declare all keys the role depends on.

## requirement 2: use keyrack SDK instead of process.env

**who said this?** human, in this session

**evidence:** git.commit.push uses keyrack.get() pattern. border guard uses hardcoded env file path. inconsistency.

**what if we didn't?** border guard would continue to work via hardcoded path. but:
- humans wouldn't know to run `keyrack fill` for XAI_API_KEY
- `keyrack status` wouldn't show XAI_API_KEY status
- inconsistent UX between skills

**simpler alternative?** could just document the env file path in keyrack.yml comments. but that's a workaround, not a fix.

**verdict:** holds. consistency matters. keyrack is the canonical system.

## requirement 3: rename EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN

**who said this?** human, in this session

**evidence:** the key has `_PROD_` in name but lives in `env.prep`. unclear.

**what if we didn't?** name would remain inaccurate. not a blocker, but adds cognitive load.

**scope concern:** a rename requires update of all references. could be risky.

**verdict:** holds, but lower priority. can be done in same PR or separate.

## requirement 4: remove shell wrapper credential logic

**who said this?** implied by requirement 2

**evidence:** if TypeScript handles credentials via SDK, shell wrapper's `source apikeys.env` becomes dead code.

**what if we didn't?** shell wrapper would source env file, TypeScript would ignore it and use SDK. no harm, but the code would be stale.

**verdict:** holds. dead code should be removed.

## overall assessment

all requirements are justified:
1. **XAI_API_KEY in keyrack.yml** — documents dependency
2. **keyrack SDK** — consistency with other skills
3. **rename token** — fixes inaccurate name (low priority)
4. **remove shell source** — removes dead code

no requirement is too large or misdirected. scope is focused on one hook + keyrack.yml.
