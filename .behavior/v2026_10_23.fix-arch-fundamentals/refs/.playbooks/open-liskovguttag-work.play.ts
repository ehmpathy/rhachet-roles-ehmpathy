import { writeFileSync } from 'fs';
import { join } from 'path';

const DIR_RAW = join(__dirname, '..', '.raw');

/**
 * .what = from the open library search tab, follow the 1986 work, then save its text
 * .why = the work page carries the full author list, the publisher, and the table of contents
 */
export const action = async ({ page }: { page: any }) => {
  const tab = page.context().pages().find((p: any) => p.url().includes('openlibrary.org/search'));
  if (!tab) throw new Error('no open library search tab; run open-captcha-tabs first');
  await tab.getByRole('link', { name: /^Abstraction and specification in program development$/i }).first().click();
  await tab.waitForURL(/openlibrary\.org\/works\//, { timeout: 30000 });
  await tab.waitForTimeout(2000);
  const text: string = await tab.evaluate(() => document.body?.innerText ?? '');
  writeFileSync(
    join(DIR_RAW, 'page.liskovguttag1986-work.text.md'),
    `url: ${tab.url()}\ntitle: ${await tab.title()}\nfetchedAt: ${new Date().toISOString()}\n\n${text}`,
  );
  return { url: tab.url(), textLength: text.length };
};
