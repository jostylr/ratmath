import { readFile } from 'node:fs/promises';
import { load } from './load.js';
const variant = process.argv[2], path = process.argv[3];
if (!variant || !path) throw new Error('Usage: bun integrated-core/run.js baseline|candidate|candidate-wired SCRIPT.rix');
const env = await load(variant);
const result = env.run(env.parse(await readFile(path, 'utf8')));
console.log(env.rix.formatValue(result));
