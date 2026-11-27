/**
 * .what = reload each walled tab and bring the first to the front
 * .why = a human clears each bot check in view; a fresh load restarts a stalled challenge
 */
export const action = async ({ page }: { page: any }) => {
  const walled = page
    .context()
    .pages()
    .filter((tab: any) => /dl\.acm\.org|openlibrary\.org/.test(tab.url()));
  for (const tab of walled) {
    await tab.reload({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => undefined);
  }
  if (walled[0]) await walled[0].bringToFront();
  return { walled: walled.map((tab: any) => tab.url()) };
};
