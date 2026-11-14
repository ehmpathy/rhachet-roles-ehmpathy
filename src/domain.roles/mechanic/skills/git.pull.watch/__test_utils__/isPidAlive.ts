/**
 * .what = is a pid alive?
 * .why  = a test proves a daemon stopped, or a stranger was spared, by the pid itself
 * .note = only ESRCH means gone; any other fault (EPERM) is thrown, never read as dead
 */
export const isPidAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
    throw error;
  }
};
