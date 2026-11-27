import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR_RAW = join(__dirname, '..', '.raw');

/**
 * .what = the index pages whose links to record, each to its raw id
 * .why = a source url comes from the publisher's own index, never a guess (a guessed url 404s)
 */
const INDEX_PAGES: { id: string; url: string }[] = [
  { id: 'links.fowler-tag-event-architectures', url: 'https://martinfowler.com/tags/event%20architectures.html' },
  { id: 'links.fowler-event-narrative', url: 'https://martinfowler.com/eaaDev/EventNarrative.html' },
  { id: 'links.fowler-201701-event-driven', url: 'https://martinfowler.com/articles/201701-event-driven.html' },
  { id: 'links.fowler-tag-database', url: 'https://martinfowler.com/tags/database.html' },
  { id: 'links.kleppmann-home', url: 'https://martin.kleppmann.com/' },
  { id: 'links.cidr2015-program', url: 'https://www.cidrdb.org/cidr2015/program.html' },
  { id: 'links.kleppmann2015-database-inside-out', url: 'https://martin.kleppmann.com/2015/03/04/turning-the-database-inside-out.html' },
];

/**
 * .what = skip an index already recorded
 * .why = a rerun after an edit fetches only the new pages
 */
const isRecorded = (input: { id: string }) => existsSync(join(DIR_RAW, `${input.id}.json`));

/**
 * .what = open each index page and record every link: its text and its absolute href
 * .why = the fetch round then cites only urls the publisher lists
 */
export const action = async ({ page }: { page: any }) => {
  mkdirSync(DIR_RAW, { recursive: true });
  const saved = [];
  for (const index of INDEX_PAGES) {
    if (isRecorded({ id: index.id })) continue;
    const tab = await page.context().newPage();
    try {
      const response = await tab.goto(index.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await tab.waitForTimeout(1500);
      const links = await tab.$$eval('a[href]', (els: any[]) =>
        els.map((el) => ({ text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(), href: el.href })),
      );
      writeFileSync(
        join(DIR_RAW, `${index.id}.json`),
        JSON.stringify({ index, urlFinal: tab.url(), status: response?.status() ?? null, title: await tab.title(), fetchedAt: new Date().toISOString(), links }, null, 2),
      );
      saved.push({ id: index.id, status: response?.status() ?? null, links: links.length });
    } finally {
      await tab.close().catch(() => undefined);
    }
  }
  return { saved };
};
