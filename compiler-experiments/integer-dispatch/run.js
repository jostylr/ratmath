import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {load} from './load.js';
const env=await load(process.argv[2]||'comparisons');
const source=process.argv[3]?await readFile(resolve(process.argv[3]),'utf8'):'Sum(n)->{@ i=0-0,r=0-0; i<n; r+=i,i+=1; ;r}; Sum(100);';
console.log(env.rix.formatValue(env.run(env.parse(source))));
