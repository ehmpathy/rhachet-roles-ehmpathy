import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * .what = one source to fetch: a dblp bibliographic record, or a page to read
 * .why = dblp yields the full citation; a page yields verbatim text to quote
 */
interface Source {
  id: string;
  kind: 'crossref' | 'dblp' | 'page' | 'pdf';
  query?: string;
  url?: string;
  keywords: string[];
}

const DIR_PLAYBOOKS = __dirname;
const DIR_RAW = join(__dirname, '..', '.raw');

/**
 * .what = cut a window of text around each keyword hit
 * .why = keeps the verbatim quote with enough context to cite it honestly
 */
const getAllKeywordWindows = (input: {
  text: string;
  keywords: string[];
}): { keyword: string; window: string }[] =>
  input.keywords.flatMap((keyword) => {
    const lower = input.text.toLowerCase();
    const hits: number[] = [];
    let at = lower.indexOf(keyword.toLowerCase());
    while (at >= 0 && hits.length < 3) {
      hits.push(at);
      at = lower.indexOf(keyword.toLowerCase(), at + keyword.length);
    }
    return hits.map((hit) => ({
      keyword,
      window: input.text
        .slice(Math.max(0, hit - 400), hit + 400)
        .replace(/\s+/g, ' ')
        .trim(),
    }));
  });

/**
 * .what = every source across sources.json and each sources.round=*.json
 * .why = a new round is a new file; no round is ever swapped in by hand
 */
const getAllSources = (): Source[] =>
  readdirSync(DIR_PLAYBOOKS)
    .filter((name) => name === 'sources.json' || /^sources\.round=.+\.json$/.test(name))
    .flatMap((name) => JSON.parse(readFileSync(join(DIR_PLAYBOOKS, name), 'utf-8')) as Source[]);

/**
 * .what = the raw record path a source writes
 */
const asRawPath = (input: { source: Source }): string => {
  if (input.source.kind === 'crossref') return join(DIR_RAW, `${input.source.id}.crossref.json`);
  if (input.source.kind === 'pdf') return join(DIR_RAW, `${input.source.id}.pdf`);
  return join(DIR_RAW, `${input.source.id}.json`);
};

/**
 * .what = fetch each source not yet captured; write one raw record per source
 * .why = every citation in the route refs traces to what the browser saw; a rerun fetches only what is new
 */
export const action = async ({ page }: { page: any }) => {
  const sources: Source[] = getAllSources().filter((source) => !existsSync(asRawPath({ source })));
  mkdirSync(DIR_RAW, { recursive: true });

  const summary: { id: string; status: string; title: string | null }[] = [];

  for (const source of sources) {
    // fetch a crossref bibliographic record (the doi registrar's own metadata)
    if (source.kind === 'crossref') {
      const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(source.query!)}&rows=3&select=DOI,title,author,container-title,volume,issue,page,issued,publisher,type`;
      // skip a record already fetched
      if (existsSync(join(DIR_RAW, `${source.id}.crossref.json`))) {
        summary.push({ id: source.id, status: 'crossref cached', title: null });
        continue;
      }
      try {
        // retry with backoff; crossref throttles bursts with empty bodies
        let items: any[] | null = null;
        for (let attempt = 1; attempt <= 4 && items === null; attempt++) {
          await page.waitForTimeout(1500 * attempt);
          const res = await page.request.get(url, { timeout: 30000, headers: { 'User-Agent': 'rhachet-roles-ehmpathy research (mailto:owl@ehmpath.com)' } });
          const raw = await res.text();
          if (raw.trim().startsWith('{')) items = JSON.parse(raw)?.message?.items ?? [];
        }
        if (items === null) throw new Error('crossref empty after 4 attempts');
        writeFileSync(
          join(DIR_RAW, `${source.id}.crossref.json`),
          JSON.stringify({ source, url, fetchedAt: new Date().toISOString(), items }, null, 2),
        );
        summary.push({ id: source.id, status: `crossref ${items.length} items`, title: items[0]?.title?.[0] ?? null });
      } catch (error: any) {
        summary.push({ id: source.id, status: `error: ${error.message.slice(0, 80)}`, title: null });
      }
      continue;
    }

    // fetch a pdf's bytes as the browser receives them; the text is extracted after, by pdftotext
    if (source.kind === 'pdf') {
      try {
        const res = await page.request.get(source.url!, { timeout: 60000 });
        const body: Buffer = await res.body();
        const isPdf = body.subarray(0, 5).toString() === '%PDF-';
        if (!isPdf) {
          summary.push({ id: source.id, status: `not a pdf ${res.status()}`, title: null });
          continue;
        }
        writeFileSync(asRawPath({ source }), body);
        summary.push({ id: source.id, status: `pdf ${res.status()} bytes=${body.length}`, title: null });
      } catch (error: any) {
        summary.push({ id: source.id, status: `error: ${error.message.slice(0, 80)}`, title: null });
      }
      continue;
    }

    // fetch a dblp bibliographic record
    if (source.kind === 'dblp') {
      const url = `https://dblp.org/search/publ/api?q=${encodeURIComponent(source.query!)}&format=json&h=5`;
      try {
        const res = await page.request.get(url, { timeout: 30000 });
        const body = await res.json();
        const hits = body?.result?.hits?.hit ?? [];
        writeFileSync(
          join(DIR_RAW, `${source.id}.json`),
          JSON.stringify({ source, url, fetchedAt: new Date().toISOString(), hits }, null, 2),
        );
        summary.push({ id: source.id, status: `dblp ${hits.length} hits`, title: hits[0]?.info?.title ?? null });
      } catch (error: any) {
        summary.push({ id: source.id, status: `error: ${error.message.slice(0, 80)}`, title: null });
      }
      continue;
    }

    // read a page in its own tab, so one bot-check redirect loop cannot poison the next source
    const tab = await page.context().newPage();
    try {
      const response = await tab.goto(source.url!, { waitUntil: 'domcontentloaded', timeout: 45000 });
      // wait out a proof-of-work bot challenge (anubis), up to 30s
      await tab.waitForTimeout(1500);
      for (let waited = 0; waited < 30000; waited += 1000) {
        const titleNow: string = await tab.title();
        if (!/not a bot|oh noes|just a moment/i.test(titleNow)) break;
        await tab.waitForTimeout(1000);
      }
      await tab.waitForTimeout(1000);
      const title = await tab.title();

      // leave a walled page unwritten, so the next run retries it once a human clears the wall
      if (/not a bot|oh noes|just a moment/i.test(title)) {
        summary.push({ id: source.id, status: `walled ${response?.status()}`, title });
        continue;
      }

      const meta = await tab.$$eval('meta', (els: any[]) =>
        els
          .map((el) => ({ name: el.getAttribute('name') ?? el.getAttribute('property'), content: el.getAttribute('content') }))
          .filter((m) => m.name && m.content && /^(citation_|dc\.|DC\.|og:title|description)/.test(m.name)),
      );
      const text: string = await tab.evaluate(() => document.body?.innerText ?? '');
      const windows = getAllKeywordWindows({ text, keywords: source.keywords });
      writeFileSync(
        join(DIR_RAW, `${source.id}.json`),
        JSON.stringify(
          {
            source,
            urlFinal: tab.url(),
            status: response?.status() ?? null,
            fetchedAt: new Date().toISOString(),
            title,
            meta,
            windows,
            textLength: text.length,
            // the whole text, so a quote, a date, or a caveat outside every window still traces to the capture
            text,
          },
          null,
          2,
        ),
      );
      summary.push({ id: source.id, status: `page ${response?.status()} windows=${windows.length}`, title });
    } catch (error: any) {
      summary.push({ id: source.id, status: `error: ${error.message.slice(0, 80)}`, title: null });
    } finally {
      await tab.close().catch(() => undefined);
    }
  }

  writeFileSync(join(DIR_RAW, '_summary.json'), JSON.stringify(summary, null, 2));
  return { fetched: summary.length };
};
