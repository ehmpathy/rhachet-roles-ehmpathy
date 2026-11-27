/**
 * .what = reopen the karpathy 2023 post on x, and wait for the post text to render
 * .why = x's interstitial clears itself after a pause; a short wait captures only the wall
 */
const URL_X = 'https://x.com/karpathy/status/1617979122625712128';

export const action = async ({ page }: { page: any }) => {
  const tab = await page.context().newPage();
  await tab.goto(URL_X, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => undefined);

  // wait for the post body; x renders it client-side, once the wall clears
  const rendered = await tab
    .waitForSelector('[data-testid="tweetText"]', { state: 'visible', timeout: 90000 })
    .then(() => true)
    .catch(() => false);

  const text: string = rendered ? await tab.locator('[data-testid="tweetText"]').first().innerText() : '';
  return { urlFinal: tab.url(), title: await tab.title(), rendered, text };
};
