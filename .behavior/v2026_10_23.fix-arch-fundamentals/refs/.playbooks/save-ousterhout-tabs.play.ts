import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR_RAW = join(__dirname, '..', '.raw');

/**
 * .what = the search tabs to keep, keyed by a fragment of each query
 * .why = google rewrites the url after the wall, so match on the query words
 */
const TABS_KEPT: { id: string; urlHas: string }[] = [
  { id: 'ousterhout2018-simple-interface', urlHas: 'simple+implementation' },
  { id: 'ousterhout2018-define-errors', urlHas: 'out+of+existence' },
  { id: 'ousterhout2018-pass-through', urlHas: 'pass-through' },
  { id: 'ousterhout2018-deep-module', urlHas: 'best+modules' },
];

/**
 * .what = save each kept tab's full text
 * .why = the book snippet in the result text is the primary quote; a grep then verifies it verbatim
 */
export const action = async ({ page }: { page: any }) => {
  mkdirSync(DIR_RAW, { recursive: true });
  const saved = [];
  for (const tab of page.context().pages()) {
    const url: string = decodeURIComponent(tab.url());
    const kept = TABS_KEPT.find((t) => url.includes(t.urlHas) || url.includes(t.urlHas.replace(/\+/g, ' ')));
    if (!kept) continue;
    const text: string = await tab.evaluate(() => document.body?.innerText ?? '');
    writeFileSync(join(DIR_RAW, `page.${kept.id}.text.md`), `url: ${tab.url()}\ntitle: ${await tab.title()}\nfetchedAt: ${new Date().toISOString()}\n\n${text}`);
    saved.push({ id: kept.id, textLength: text.length, walled: /unusual traffic/i.test(text) });
  }
  return { saved };
};
