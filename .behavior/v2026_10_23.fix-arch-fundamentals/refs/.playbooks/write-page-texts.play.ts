import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR_RAW = join(__dirname, '..', '.raw');

/**
 * .what = write each page record's full text to `${id}.json.txt`, beside its record
 * .why = a long page reads line by line as text; inside one json string it cannot be quoted with care
 */
export const action = async () => {
  const written: string[] = [];
  for (const name of readdirSync(DIR_RAW)) {
    if (!/^page\..+\.json$/.test(name)) continue;
    const pathTxt = join(DIR_RAW, `${name}.txt`);
    if (existsSync(pathTxt)) continue;
    const record = JSON.parse(readFileSync(join(DIR_RAW, name), 'utf-8'));
    if (typeof record.text !== 'string') continue;
    writeFileSync(pathTxt, `${record.title}\n${record.urlFinal}\nfetched ${record.fetchedAt}\n\n${record.text}\n`);
    written.push(name);
  }
  return { written };
};
