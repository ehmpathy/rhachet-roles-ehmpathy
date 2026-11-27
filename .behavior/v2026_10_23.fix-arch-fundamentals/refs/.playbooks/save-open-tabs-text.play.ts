import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR_RAW = join(__dirname, '..', '.raw');

/**
 * .what = the open tabs to keep, keyed by a url fragment, each to its ref id
 * .why = the full page text lets a grep verify each quote, byline, and date
 */
const TABS_KEPT: { id: string; urlHas: string }[] = [
  { id: 'lamport2015', urlHas: 'who-builds-a-house' },
  { id: 'newcombe2015', urlHas: 'how-amazon-web-services' },
  { id: 'karpathy2017', urlHas: 'software-2-0' },
  { id: 'karpathy2023', urlHas: 'x.com/karpathy' },
  { id: 'parnas1972', urlHas: '361598.361623' },
  { id: 'liskovzilles1974', urlHas: '942572.807045' },
  { id: 'liskovguttag1986-openlibrary', urlHas: 'openlibrary.org' },
];

/**
 * .what = save each kept tab's full text and its <time> stamps
 * .why = bylines and dates sit in the body text, not in citation meta, on these pages
 */
export const action = async ({ page }: { page: any }) => {
  mkdirSync(DIR_RAW, { recursive: true });
  const saved = [];
  for (const tab of page.context().pages()) {
    const kept = TABS_KEPT.find((t) => tab.url().includes(t.urlHas));
    if (!kept) continue;
    const text: string = await tab.evaluate(() => document.body?.innerText ?? '');
    const times = await tab.$$eval('time', (els: any[]) =>
      els.map((el) => ({ datetime: el.getAttribute('datetime'), text: el.textContent })),
    );
    writeFileSync(join(DIR_RAW, `page.${kept.id}.text.md`), `url: ${tab.url()}\ntitle: ${await tab.title()}\nfetchedAt: ${new Date().toISOString()}\ntimes: ${JSON.stringify(times)}\n\n${text}`);
    saved.push({ id: kept.id, textLength: text.length, times: times.length });
  }
  return { saved };
};
