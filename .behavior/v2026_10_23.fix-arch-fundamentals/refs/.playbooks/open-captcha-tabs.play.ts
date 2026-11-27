/**
 * .what = open each bot-walled source in its own tab, and leave it open
 * .why = a human clears each challenge once; the session cookies then let the fetch playbook through
 * .note = round=transactions-bound-by-trait; earlier rounds (parnas 1972, liskov & zilles 1974) are saved under .raw/
 */
const URLS_BLOCKED = [
  'https://dl.acm.org/doi/10.1145/289.291', // härder & reuter 1983
  'https://docs.stripe.com/api/idempotent_requests', // stripe docs, timed out on first fetch
];

export const action = async ({ page }: { page: any }) => {
  for (const url of URLS_BLOCKED) {
    const tab = await page.context().newPage();
    await tab.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => undefined);
  }
  return { opened: URLS_BLOCKED.length };
};
