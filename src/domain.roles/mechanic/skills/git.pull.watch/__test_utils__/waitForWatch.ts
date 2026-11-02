import { MalfunctionError } from 'helpful-errors';

/**
 * .what = wait until a check holds; throw with the label once the bound passes
 * .why  = a daemon acts on its own clock; a test awaits the effect, never a fixed sleep
 * .note = `scene` is any handle that can describe its state, so a timeout names it
 */
export const waitForWatch = async <T>(input: {
  label: string;
  check: () => T | null | undefined | false;
  timeoutMs?: number;
  scene?: { getDiagnostics: () => string };
}): Promise<T> => {
  // the bound is generous: a shared box under load slows each stub spawn, so a
  // tick can take many seconds; the wait ends the moment the check holds
  const deadline = Date.now() + (input.timeoutMs ?? 90_000);
  while (Date.now() < deadline) {
    const found = input.check();
    if (found) return found;
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new MalfunctionError(`waitForWatch timed out: ${input.label}`, {
    timeoutMs: input.timeoutMs ?? 90_000,
    diagnostics: input.scene?.getDiagnostics() ?? null,
  });
};
