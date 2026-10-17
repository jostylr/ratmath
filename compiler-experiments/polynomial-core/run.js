import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { load } from './load.js';
import { here } from './build.js';
const env = await load();
const file = process.argv[2] ? resolve(process.argv[2]) : resolve(here, 'scripts/demo.rix');
console.log(env.rix.formatValue(env.run(env.parse(await readFile(file, 'utf8')))));
