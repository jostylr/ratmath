import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {cpus,platform,arch} from 'node:os';
import {createMarkedExactSession} from './engine.js';
const start=performance.now(),e=await createMarkedExactSession(), sessionMs=performance.now()-start;
const {Integer}=e.core;
const horner='(cs,x) -> {@ r=0-0,i=1;i<=cs.Len();r:=r*x+cs.Get(i),i+=1;;r};';
const sum='(xs) -> {@ r=0-0,i=1;i<=xs.Len();r:=r+xs.Get(i),i+=1;;r};';
e.run(`HornerPlain${horner}\n## @exact-core\nHornerFast${horner}
SumPlain${sum}\n## @exact-core\nSumFast${sum}
HornerFold(cs,x)->.exactLoop.Fold(cs,0,(a,c,x)->a*x+c,[x]);
SumFold(xs)->.exactLoop.Fold(xs,0,(a,b)->a+b);
cs:=[${Array.from({length:20},(_,i)=>`${i+1}/${i%5+1}`).join(',')}];point:=7/5;
longcs:=[${Array.from({length:96},(_,i)=>`${i%17-8}/${i%7+1}`).join(',')}];longpoint:=1009/1013;
values:=[${Array.from({length:512},(_,i)=>i%31-15).join(',')}];`);
function directHorner(cs,x){let r=new Integer(0);for(const c of cs.values)r=r.multiply(x).add(c);return r;}
function directSum(xs){let r=new Integer(0);for(const x of xs.values)r=r.add(x);return r;}
const fixtures=[
  {name:'Horner, 20 Rational coefficients',dimensions:{coefficients:20,point:'7/5'},repetitions:20,sources:['HornerPlain(cs,point);','HornerFast(cs,point);','HornerFold(cs,point);'],direct:()=>directHorner(e.context.get('cs'),e.context.get('point'))},
  {name:'Sum, 512 Integers',dimensions:{elements:512},repetitions:4,sources:['SumPlain(values);','SumFast(values);','SumFold(values);'],direct:()=>directSum(e.context.get('values'))},
  {name:'Horner, 96 Rational coefficients',dimensions:{coefficients:96,point:'1009/1013'},repetitions:4,sources:['HornerPlain(longcs,longpoint);','HornerFast(longcs,longpoint);','HornerFold(longcs,longpoint);'],direct:()=>directHorner(e.context.get('longcs'),e.context.get('longpoint'))},
];
fixtures.push({...fixtures[0],name:'Horner, 20 Rationals, poly + stats loaded',setup:()=>e.run('.Plugin.Load("poly");.Plugin.Load("stats");')});
fixtures.push({...fixtures[1],name:'Sum, 512 Integers, poly + stats loaded'});
const canonical=v=>({type:v.constructor.name,value:v.toString()});
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
const rows=[];
for(const fixture of fixtures) {
  if(fixture.setup)fixture.setup();
  const paths=fixture.sources.map((source,i)=>{const ir=e.parse(source);return {name:['interpreted','marked exact-core','Fold'][i],source,run:()=>e.evaluate(ir)};});
  paths.push({name:'handwritten core JS',run:fixture.direct});
  const expected=canonical(fixture.direct()),firstUse={};
  for(const path of paths) {
    const buildsBefore=e.stats.compiles, hitsBefore=e.stats.cacheHits, before=e.stats.compileMs,foldBefore=e.foldStats.compileMs,t=performance.now(),value=path.run(),elapsed=performance.now()-t;
    firstUse[path.name]={newMarkedBuilds:e.stats.compiles-buildsBefore,markedCacheHits:e.stats.cacheHits-hitsBefore,totalMs:elapsed,compilerMs:e.stats.compileMs-before+e.foldStats.compileMs-foldBefore};
    assert.deepEqual(canonical(value),expected);
  }
  function measure(path) {
    const n=path===paths.at(-1)?100:fixture.repetitions,results=new Array(n),t=performance.now();
    for(let i=0;i<n;i++) results[i]=path.run();
    const ms=(performance.now()-t)/n;
    for(const result of results) assert.deepEqual(canonical(result),expected);
    return ms;
  }
  const samples=Object.fromEntries(paths.map(p=>[p.name,[]]));
  for(let warm=0;warm<3;warm++)for(const path of paths)measure(path);
  for(let round=0;round<9;round++)for(let j=0;j<paths.length;j++) {
    const p=paths[(round+j)%paths.length];samples[p.name].push(measure(p));
  }
  const medians=Object.fromEntries(paths.map(p=>[p.name,median(samples[p.name])]));
  const row={registryVariantCounts:Object.fromEntries(['ADD','SUB','MUL','DIV','LTE','CALL_METHOD'].map(name=>[name,e.registry.get(name)?.variants?.length||0])),name:fixture.name,dimensions:fixture.dimensions,repetitions:fixture.repetitions,sources:fixture.sources,firstUse,samplesMs:samples,medianMs:medians,speedup:medians.interpreted/medians['marked exact-core'],markedOverFold:medians['marked exact-core']/medians.Fold,expectedDigest:createHash('sha256').update(JSON.stringify(expected)).digest('hex')};
  rows.push(row);console.log(JSON.stringify({name:row.name,medianMs:medians,speedup:row.speedup,markedOverFold:row.markedOverFold}));
}
assert.equal(e.stats.compiles,2);assert.equal(e.stats.rejections,0);assert.equal(e.foldStats.interpretedFolds,0);
const provenance=JSON.parse(await readFile(new URL('../metadata-cache/tmp/build.json',import.meta.url)));
const sourceHashes=Object.fromEntries(await Promise.all(['compiler.js','engine.js','bench.js','../direct-loops/compiler.js','../direct-loops/engine.js'].map(async name=>[name,createHash('sha256').update(await readFile(new URL(name,import.meta.url))).digest('hex')])));
const suffix=process.versions.bun?'bun':'node';
await writeFile(new URL(`./results/bench-${suffix}.json`,import.meta.url),JSON.stringify({timestamp:new Date().toISOString(),runtime:process.versions,machine:{cpu:cpus()[0].model,platform:platform(),arch:arch()},sessionMs,methodology:'3 warmup batches; 9 rotating-order rounds; median ms per public call; preparation/parsing/loading excluded; first-use compilation reported separately; exact value AND class verified for every result outside timing; same copied production core and RiX in all paths; guards and snapshots included for marked and Fold; handwritten JS is unguarded.',stats:e.stats,foldStats:e.foldStats,results:rows},null,2)+'\n');
await writeFile(new URL(`./results/generated-${suffix}.json`,import.meta.url),JSON.stringify({marked:e.inspect(),fold:e.inspectFolds()},null,2)+'\n');
await writeFile(new URL('./results/provenance.json',import.meta.url),JSON.stringify({timestamp:provenance.timestamp,sourceRoot:provenance.sourceRoot,experimentSources:sourceHashes,sourceInventory:provenance.original,baseline:provenance.paths.baseline,cached:provenance.paths.cached},null,2)+'\n');
