import { keyrack } from 'rhachet/keyrack';

/**
 * .what = the api key name a brain slug authenticates with
 * .why = each supplier declares its own key name (FireworksCreds vs the xai
 *        getter), and the guard picks its brain at runtime — so the key name
 *        follows the slug rather than sitting as a constant.
 */
export const getOneGuardBorderBrainKeyName = (input: {
  slug: string;
}): 'FIREWORKS_API_KEY' | 'XAI_API_KEY' =>
  input.slug.startsWith('fireworks/') ? 'FIREWORKS_API_KEY' : 'XAI_API_KEY';

/**
 * .what = supplies the chosen brain's api key, from the env or from keyrack
 * .why = the guard runs as a PostToolUse hook from whatever cwd the caller has.
 *        keyrack's shorthand supplier needs a keyrack.yml to build the key
 *        slug, and a temp cwd has none — it fails with "cannot construct slug".
 *        an env key that is already present is therefore preferred, and keyrack
 *        is the fallback for a real repo where no key is exported yet.
 *
 * .note = returns only the key the chosen brain needs, so a caller who holds one
 *         brain's key is not blocked by the absence of the other's.
 */
export const getOneGuardBorderBrainCreds = async (input: {
  slug: string;
  keyrackEnv: string;
}): Promise<Record<string, string>> => {
  const keyName = getOneGuardBorderBrainKeyName({ slug: input.slug });

  // prefer a key already present in the env — the only form that works cwd-free
  const keyFromEnv = process.env[keyName];
  if (keyFromEnv) return { [keyName]: keyFromEnv };

  // otherwise reach for keyrack, which needs a keyrack.yml in the cwd's repo
  // .why = keyrack throws a raw ConstraintError when it cannot build the key
  //        slug (no keyrack.yml in this cwd). that surfaces as a stack trace
  //        with no remedy, so every path to "no key" is turned into the one
  //        message that names the fix (rule.require.errors-name-the-fix).
  const grant = await keyrack
    .get({
      for: { key: keyName },
      owner: 'ehmpath',
      env: input.keyrackEnv,
    })
    .catch(() => null);

  // .why = the remedy names --key rather than the whole env. a broad unlock
  //        walks every key in the env, which hangs on the aws.config sso keys
  //        that want a browser — and this guard needs exactly one key, already
  //        resolved above (rule.require.narrow-keyrack-unlocks).
  if (!grant || grant.attempt.status !== 'granted')
    throw new Error(
      `${keyName} locked — run: rhx keyrack unlock --owner ehmpath --env ${input.keyrackEnv} --key ${keyName}`,
    );

  return { [keyName]: grant.attempt.grant.key.secret };
};
