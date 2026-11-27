/**
 * .what = open one google books full-text search per ousterhout claim, each in its own tab
 * .why = google walls a scripted search; a human clears the wall once, then each tab shows
 *        the book's own snippet, the primary text the abstraction catalog cites
 */
export const URLS_OUSTERHOUT: { id: string; url: string }[] = [
  { id: 'ousterhout2018-simple-interface', url: 'https://www.google.com/search?tbm=bks&q=%22simple+interface+than+a+simple+implementation%22' },
  { id: 'ousterhout2018-define-errors', url: 'https://www.google.com/search?tbm=bks&q=ousterhout+%22define+errors+out+of+existence%22' },
  { id: 'ousterhout2018-pass-through', url: 'https://www.google.com/search?tbm=bks&q=ousterhout+%22a+pass-through+method+is%22' },
  { id: 'ousterhout2018-deep-module', url: 'https://www.google.com/search?tbm=bks&q=ousterhout+%22the+best+modules+are+those%22' },
];

export const action = async ({ page }: { page: any }) => {
  for (const { url } of URLS_OUSTERHOUT) {
    const tab = await page.context().newPage();
    await tab.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => undefined);
  }
  return { opened: URLS_OUSTERHOUT.length };
};
