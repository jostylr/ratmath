import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { load } from './load.js';
const variant=process.argv[2]||'literals',env=await load(variant);
const source=process.argv[3]?await readFile(resolve(process.argv[3]),'utf8'):'Horner(c,x) -> {@ r=0-0,i=1; i<=c.Len(); r:=r*x+c.Get(i),i+=1; ;r}; Horner([2,-3,1],1/3);';
console.log(env.rix.formatValue(env.run(env.parse(source))));
