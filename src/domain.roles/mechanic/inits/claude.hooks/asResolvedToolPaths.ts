import { spawnSync } from 'child_process';

/**
 * .what = maps each tallied tool to its absolute path on PATH
 * .why  = the fork-budget shim must `exec` the real binary directly. were the
 *         shim to look the path up itself, that lookup would fork — and the
 *         instrument would count its own overhead as the hook's.
 *
 * .note = a tool absent from PATH is OMITTED from the result rather than
 *         mapped to an empty string. the caller fails loud on the gap
 *         (`toolsAbsent`), because an absent shim makes every `toEqual(0)`
 *         on that tool pass vacuously — the failhide this instrument is most
 *         exposed to.
 */
export const asResolvedToolPaths = (input: {
  tools: readonly string[];
}): Record<string, string> =>
  input.tools.reduce<Record<string, string>>((paths, tool) => {
    const found = spawnSync('sh', ['-c', `command -v ${tool} || true`], {
      encoding: 'utf-8',
    });
    const realPath = (found.stdout ?? '').trim();
    if (!realPath) return paths;
    return { ...paths, [tool]: realPath };
  }, {});
