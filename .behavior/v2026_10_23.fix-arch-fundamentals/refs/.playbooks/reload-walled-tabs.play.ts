/**
 * .what = reload each tab that still shows google's traffic wall
 * .why = once a human clears the wall in one tab, the session cookie can let the others through
 */
export const action = async ({ page }: { page: any }) => {
  const reloaded: string[] = [];
  for (const tab of page.context().pages()) {
    const text: string = await tab.evaluate(() => document.body?.innerText ?? '').catch(() => '');
    if (!/unusual traffic/i.test(text) && !tab.url().includes('/sorry/')) continue;
    const target = decodeURIComponent(new URL(tab.url()).searchParams.get('continue') ?? tab.url());
    await tab.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => undefined);
    reloaded.push(target);
  }
  return { reloaded };
};
