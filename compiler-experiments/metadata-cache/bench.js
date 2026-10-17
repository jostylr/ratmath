import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {load} from './load.js';
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const results=[];
for(const variant of ['baseline','cached']) {
 const importStart=performance.now();const env=await load(variant);const importMs=performance.now()-importStart;
 env.cache?.clearOperatorMetadataCache();
 const start=performance.now(),cold=env.makeSession(),coldMs=performance.now()-start;
 assert.equal(env.run('1+2;',cold).toString(),'3');
 const samples=[];
 for(let i=0;i<9;i++) {
  const t=performance.now(),session=env.makeSession();samples.push(performance.now()-t);
  assert.equal(session.systemContext._pluginCatalog.loaded.size,0);
  assert.equal(env.run('1;',session).toString(),'1');
 }
 const trivial=[];for(let i=0;i<9;i++){const t=performance.now();const value=env.rix.parseAndEvaluate('1;');trivial.push(performance.now()-t);assert.equal(value.toString(),'1');}
 const row={variant,importMs,coldMs,warmMedianMs:median(samples),samplesMs:samples,freshParseMedianMs:median(trivial),freshParseSamplesMs:trivial,cache:env.cache?.operatorMetadataCacheStats()};results.push(row);console.log(JSON.stringify(row));
}
const report={timestamp:new Date().toISOString(),runtime:process.versions,methodology:'One cold construction per isolated module; nine fresh-session warm samples; nine trivial evaluations with fresh defaults. Import/setup and numeric correctness recorded separately; no session sharing.',results};
await writeFile(new URL(`results/setup-${process.versions.bun?'bun':'node'}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
