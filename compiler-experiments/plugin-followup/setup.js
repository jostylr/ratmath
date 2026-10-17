import { resolve, dirname } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { writeFile,mkdir } from 'node:fs/promises';
const here=dirname(fileURLToPath(import.meta.url));
const root=process.env.RATMATH_ROOT||resolve(here,'../..');
const rix=await import(pathToFileURL(resolve(root,'rix/src/index-node.js')));
const rows=[]; const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
function measure(name,fn,n=5){const samples=[];for(let i=0;i<n;i++){const start=performance.now();fn();samples.push(performance.now()-start);}const row={name,samplesMs:samples,medianMs:median(samples)};rows.push(row);console.log(JSON.stringify(row));}
let registry,system,context;
measure('createDefaultRegistry',()=>{registry=rix.createDefaultRegistry();});
measure('createDefaultSystemContext',()=>{system=rix.createDefaultSystemContext();});
measure('new Context',()=>{context=new rix.Context();});
const options={registry,systemContext:system,context};
measure('parseAndEvaluate 1; fresh defaults',()=>rix.parseAndEvaluate('1;'));
measure('parseAndEvaluate 1; reused session',()=>rix.parseAndEvaluate('1;',options));
await mkdir(resolve(here,'results'),{recursive:true});
await writeFile(resolve(here,`results/setup-${process.versions.bun?'bun':'node'}.json`),JSON.stringify({timestamp:new Date().toISOString(),runtime:process.versions,rows},null,2)+'\n');
