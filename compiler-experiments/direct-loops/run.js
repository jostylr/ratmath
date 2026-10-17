import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createExactSession} from './engine.js';
const e=await createExactSession();
e.run(await readFile(new URL('./scripts/kernels.rix',import.meta.url),'utf8'));
const source=process.argv[2]?await readFile(resolve(process.argv[2]),'utf8'):await readFile(new URL('./scripts/demo.rix',import.meta.url),'utf8');
console.log(e.rix.formatValue(e.run(source)));
console.log(JSON.stringify(e.stats));
