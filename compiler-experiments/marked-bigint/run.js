import { readFile } from 'node:fs/promises';
import { createMarkedSession } from './runner.js';

const path = process.argv[2];
if (!path || path.startsWith('--')) throw new Error('Usage: bun marked-bigint/run.js SCRIPT.rix [--stats]');
const session = createMarkedSession();
const result = session.load(await readFile(path, 'utf8')).run();
const display = (value) => value?.type === 'sequence' ? `[${value.values.map(display).join(', ')}]`
  : value?.type === 'string' ? JSON.stringify(value.value) : value === null ? 'null' : value?.toString();
console.log(display(result));
if (process.argv.includes('--stats')) console.log(JSON.stringify(session.stats, null, 2));
