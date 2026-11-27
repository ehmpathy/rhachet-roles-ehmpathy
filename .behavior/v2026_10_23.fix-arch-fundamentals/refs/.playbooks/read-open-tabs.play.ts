import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR_RAW = join(__dirname, '..', '.raw');

/**
 * .what = the dois to open in a fresh tab, after a human cleared the publisher's challenge
 * .why = ieee renders client-side; the doi redirects to the right document id
 */
const DOIS_IEEE: { id: string; doi: string }[] = [];

/**
 * .what = capture one tab: url, title, citation meta, and the abstract text
 * .why = the tab a human already loaded holds the page past its bot wall
 */
const getOneTabCapture = async (tab: any) => {
  const title: string = await tab.title();
  const meta = await tab.$$eval('meta', (els: any[]) =>
    els
      .map((el) => ({ name: el.getAttribute('name') ?? el.getAttribute('property'), content: el.getAttribute('content') }))
      .filter((m) => m.name && m.content && /^(citation_|dc\.|DC\.|og:|description)/.test(m.name)),
  );
  const text: string = await tab.evaluate(() => document.body?.innerText ?? '');
  const at = text.toLowerCase().indexOf('abstract');
  const abstract = at >= 0 ? text.slice(at, at + 2500).replace(/\s+/g, ' ').trim() : null;
  return { urlFinal: tab.url(), title, meta, abstract, textLength: text.length, fetchedAt: new Date().toISOString() };
};

/**
 * .what = open the ieee dois, then capture every open tab as it stands
 * .why = reads past bot walls a human already cleared, with no fresh navigation of those tabs
 */
export const action = async ({ page }: { page: any }) => {
  mkdirSync(DIR_RAW, { recursive: true });
  const context = page.context();

  // open the ieee dois in fresh tabs, with time for the client render
  for (const entry of DOIS_IEEE) {
    const tab = await context.newPage();
    await tab.goto(`https://doi.org/${entry.doi}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => undefined);
    await tab.waitForTimeout(8000);
    writeFileSync(join(DIR_RAW, `${entry.id}.json`), JSON.stringify({ source: entry, ...(await getOneTabCapture(tab)) }, null, 2));
  }

  // capture every open tab as it stands
  const captures = [];
  for (const tab of context.pages()) {
    captures.push(await getOneTabCapture(tab).catch((error: any) => ({ urlFinal: tab.url(), error: error.message })));
  }
  writeFileSync(join(DIR_RAW, '_open-tabs.json'), JSON.stringify(captures, null, 2));

  // write a short human-readable digest of the captures
  const lines = captures.map((c: any) => `## ${c.title ?? '?'}\nurl: ${c.urlFinal}\n${(c.abstract ?? '(no abstract text)').slice(0, 1200)}\n`);
  writeFileSync(join(DIR_RAW, '_open-tabs.md'), lines.join('\n'));
  return { tabs: captures.length };
};
