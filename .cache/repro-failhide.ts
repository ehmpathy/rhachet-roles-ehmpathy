export const doThing = async () => {
  try {
    await risky();
  } catch (e) {
    // swallow
  }
};