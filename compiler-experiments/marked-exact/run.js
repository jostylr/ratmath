import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createMarkedExactSession} from './engine.js';
const e=await createMarkedExactSession();
const source=await readFile(process.argv[2]?resolve(process.argv[2]):new URL('./scripts/demo.rix',import.meta.url),'utf8');
const result=e.run(source);
console.log(result?.toString());
console.log(JSON.stringify(e.stats));
