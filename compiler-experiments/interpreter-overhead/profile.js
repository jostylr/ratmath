import inspector from 'node:inspector';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { load, canonical } from './load.js';
import { fixtures, materialize } from '../polynomial-core/fixtures.js';
import { paths } from '../polynomial-core/paths.js';

if (process.versions.bun) throw new Error('Use Node for V8 sampling profiles; benchmarks also run in Bun.');
const data = await fixtures();
const session = new inspector.Session(); session.connect();
const post = (method, params={}) => new Promise((resolve,reject)=>session.post(method,params,(e,r)=>e?reject(e):resolve(r)));
await post('Profiler.enable'); await post('Profiler.setSamplingInterval',{interval:500});
const profiles=[];
for (const [variant,name,which] of [['control','integer-horner',0],['control','rational-horner',0],['control','larger-rational-horner',0],['control','larger-rational-horner',1],['literals','integer-horner',0],['literals','rational-horner',0],['literals','larger-rational-horner',0]]) {
  const env = await load(variant), programs = await paths(env);
  const f=data.find(x=>x.name===name), v=programs.variants(materialize(f.data,env.core))[which];
  const expected=canonical(v.run());
  for(let i=0;i<10;i++) v.run();
  await post('Profiler.start');
  const start=performance.now(); let batches=0,last;
  while(performance.now()-start<1500) { last=v.run(); batches++; }
  const elapsedMs=performance.now()-start;
  const {profile}=await post('Profiler.stop');
  assert.deepEqual(canonical(last),expected);
  const stem=`${variant}-${name}-${which===0?'rix':'js'}`;
  await writeFile(new URL(`./results/${stem}.cpuprofile`,import.meta.url),JSON.stringify(profile));
  const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();
  for(const n of profile.nodes) for(const child of n.children||[]) parents.set(child,n.id);
  const self=new Map(),inclusive=new Map();let total=0;
  for(let i=0;i<(profile.samples||[]).length;i++) {
    const dt=profile.timeDeltas[i]||0, id=profile.samples[i];total+=dt;self.set(id,(self.get(id)||0)+dt);
    for(let node=id;node!==undefined;node=parents.get(node)) inclusive.set(node,(inclusive.get(node)||0)+dt);
  }
  const format=(counts,aggregate)=>{
    const merged=new Map();
    for(const [id,us] of counts) {
      const f=nodes.get(id).callFrame, key=aggregate?`${f.url}:${f.lineNumber}:${f.functionName}`:id;
      const previous=merged.get(key)||{function:f.functionName||'(anonymous)',file:f.url.replace(/^.*\/tmp\/[^/]+\//,''),line:f.lineNumber+1,us:0};
      previous.us+=us;merged.set(key,previous);
    }
    return [...merged.values()].sort((a,b)=>b.us-a.us).slice(0,35).map(({us,...f})=>({...f,percent:100*us/total}));
  };
  // Attribute core normalization to its callers, not just its source file.
  const groups={};
  for(let i=0;i<(profile.samples||[]).length;i++) {
    const stack=[];
    for(let node=profile.samples[i];node!==undefined;node=parents.get(node)) stack.push(nodes.get(node).callFrame);
    const has=re=>stack.some(f=>re.test(f.url+' '+f.functionName));
    const copy=has(/cell\.js (shallowCopyValue|deepCopyValue)/),normalization=has(/rational\.js (#gcd|#normalize)/);
    const category=normalization?(copy?'Rational normalization below value copy':'Rational normalization elsewhere')
      :copy?'Other work below value copy':has(/\/packages\/core\//)?'Other core arithmetic'
      :has(/\(garbage collector\)/)?'GC':'Other interpreter/runtime/host';
    groups[category]=(groups[category]||0)+(profile.timeDeltas[i]||0);
  }
  const summary={variant,name,path:v.name,batches,elapsedMs,profileFile:`${stem}.cpuprofile`,samples:profile.samples.length,
    attribution:Object.fromEntries(Object.entries(groups).map(([k,t])=>[k,100*t/total])),self:format(self,true),inclusive:format(inclusive,false)};
  profiles.push(summary); console.log(JSON.stringify({variant,name,path:v.name,attribution:summary.attribution,topSelf:summary.self.slice(0,5)},null,2));
}
session.disconnect();
const sha=x=>createHash('sha256').update(x).digest('hex');
const provenance=Object.fromEntries(await Promise.all(['profile.js','load.js','../polynomial-core/paths.js','../integrated-core/scripts/horner.rix','results/build-provenance.json'].map(async p=>[p,sha(await readFile(new URL(p,import.meta.url)))])));
await writeFile(new URL('./results/profile-node.json',import.meta.url),JSON.stringify({timestamp:new Date().toISOString(),runtime:process.version,samplingIntervalUs:500,durationMs:1500,method:'V8 sampling; profiles are diagnostic, not benchmark timings; percentages include profiler/GC/host work',provenance,profiles},null,2)+'\n');
const lines=['# Node sampling profiles','','500 microsecond sampling interval; 1.5 seconds per case after warmup. Diagnostics only, separate from clean timings. Copy-GCD percentages attribute normalization to its call stack.','',
  '| Variant | Workload/path | Normalization below copy | Other core | Samples | Raw profile |','|---|---|---:|---:|---:|---|',
  ...profiles.map(p=>`| ${p.variant} | ${p.name} / ${p.path.startsWith('JS')?'JS':'RiX'} | ${(p.attribution['Rational normalization below value copy']||0).toFixed(1)}% | ${(p.attribution['Other core arithmetic']||0).toFixed(1)}% | ${p.samples} | [profile](${p.profileFile}) |`),''];
for(const p of profiles) lines.push(`## ${p.variant}: ${p.name}, ${p.path}`,'','| Function (self time) | Source | Sampled share |','|---|---|---:|',
  ...p.self.slice(0,10).map(f=>`| ${f.function} | ${f.file}:${f.line} | ${f.percent.toFixed(1)}% |`),'');
lines.push('Shares include profiler/GC/host samples and depend on sampling/JIT attribution. Self time is aggregated by function/source line; stack-inclusive entries in JSON are not additive. Profiles do not establish exact wall-time fractions, and these Node samples do not directly measure Bun.','');
await writeFile(new URL('./results/profile-node.md',import.meta.url),lines.join('\n'));
