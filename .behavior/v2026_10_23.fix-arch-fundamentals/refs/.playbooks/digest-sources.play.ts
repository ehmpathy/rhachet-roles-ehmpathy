import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR_RAW = join(__dirname, '..', '.raw');

/**
 * .what = render one crossref item as a citation line
 * .why = lets a human scan every candidate match at a glance
 */
const asCitationLine = (item: any): string => {
  const authors = (item.author ?? []).map((a: any) => [a.given, a.family].filter(Boolean).join(' ')).join(', ');
  const year = item.issued?.['date-parts']?.[0]?.[0] ?? '?';
  const where = [item['container-title']?.[0], item.volume && `vol ${item.volume}`, item.issue && `no ${item.issue}`, item.page && `pp ${item.page}`]
    .filter(Boolean)
    .join(', ');
  return `${authors} (${year}). ${item.title?.[0] ?? '?'}. ${where}. ${item.publisher ?? ''} [${item.type}] doi:${item.DOI}`;
};

/**
 * .what = digest every raw crossref + page record into one markdown file
 * .why = the review step reads one file, not fifty json blobs
 */
export const action = async () => {
  const files = readdirSync(DIR_RAW).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  const lines: string[] = ['# digest of raw source records', ''];
  for (const file of files.sort()) {
    const raw = JSON.parse(readFileSync(join(DIR_RAW, file), 'utf-8'));
    if (file.endsWith('.crossref.json')) {
      lines.push(`## ${raw.source.id} (crossref)`, `query: ${raw.source.query}`);
      (raw.items ?? []).forEach((item: any, i: number) => lines.push(`${i + 1}. ${asCitationLine(item)}`));
      lines.push('');
      continue;
    }
    if (!file.startsWith('page.')) continue;
    lines.push(`## ${raw.source.id} (page)`, `url: ${raw.urlFinal} · status ${raw.status} · title: ${raw.title}`);
    (raw.meta ?? []).filter((m: any) => /^citation_/.test(m.name)).forEach((m: any) => lines.push(`- meta ${m.name}: ${m.content}`));
    (raw.windows ?? []).forEach((w: any) => lines.push(`- [${w.keyword}] …${w.window}…`));
    lines.push('');
  }
  writeFileSync(join(DIR_RAW, '_digest.md'), lines.join('\n'));
  return { files: files.length };
};
