import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createMarkedExactSession} from './engine.js';
const e=await createMarkedExactSession(), {Integer,Rational}=e.core;
const canonical=v=>({type:v.constructor.name,value:v.toString()});
let checks=0;
const check=f=>{f();checks++;};
const equal=(a,b)=>check(()=>assert.deepEqual(canonical(a),canonical(b)));
const marker='## @exact-core\n';
const horner='(cs,x) -> {@ r=0-0,i=1; i<=cs.Len(); r:=r*x+cs.Get(i),i+=1; ;r};';
e.run(`Plain${horner}\n${marker}Fast${horner}`);
check(()=>assert.equal(e.stats.compiles,0));
for(let n=0;n<48;n++) {
  const cs=Array.from({length:n%13},(_,i)=>`${((n+7)*(i+3))%19-9}/${n%3?i%5+1:1}`).join(',');
  e.run(`cs:=[${cs}];x:=${n%9-4}/5;`);
  equal(e.run('Fast(cs,x);'),e.run('Plain(cs,x);'));
  equal(e.run('Fast(cs,x);'),e.run('.exactLoop.Fold(cs,0,(a,c,x)->a*x+c,[x]);'));
}
check(()=>assert.equal(e.stats.compiles,1));check(()=>assert.ok(e.stats.cacheHits>0));
// Same generated numeric union works for Integer, Rational and mixed inputs.
e.run(`${marker}Select(a,b)-> a<b ?: a+1 ?_ b-1;`);
for(const [a,b] of [['1','3/2'],['3/2','1'],['-7/3','-2'],['0','0']]) {
  e.run('SelectPlain(a,b)->a<b ?: a+1 ?_ b-1;');
  equal(e.run(`Select(${a},${b});`),e.run(`SelectPlain(${a},${b});`));
}
for(const op of ['<','<=','>','>=','==','!=']) for(const [a,b] of [['1','1/1'],['-2','-7/3'],['3/2','2']]) {
  const body=`(a,b)->a${op}b ?: a+1 ?_ b-1;`;
  e.run(`ComparePlain${body}\n${marker}CompareFast${body}`);
  equal(e.run(`CompareFast(${a},${b});`),e.run(`ComparePlain(${a},${b});`));
}
// Loop update slot, block locals, explicit outer reads and numeric copies.
for(const body of [
  '(n)->{@ r:=0,i:=1;i<=n;r+=i;i+=1;r};',
  '(n)->{; z:=n+1; {@ r:=0,i:=1;i<=@z;r+=i;i+=1;r}};',
  '(n)->{; a:=n;b:=a;b+=1;a+b};',
  '(n)->{@ r:=0,i:=1;i<=n;r+= {@ s:=0,j:=1;j<=@i;s+=j;j+=1;s};i+=1;r};',
  '(n)->{@ r:=0,i:=1;{; i<=n};r+=i;i+=1;{; r}};',
  '(n)->{; z:=n+1; {@ <limit~z> r:=0,i:=1;i<=limit;r+=i;i+=1;r}};',
  '(n)->{; z:=n+1; {; <limit~z> limit+1}};',
  '(n)->-n+n^2;'
]) {
  e.run(`ControlPlain${body}\n${marker}ControlFast${body}`);
  equal(e.run('ControlFast(7);'),e.run('ControlPlain(7);'));
}
// Reflective symbolic specs still originate from the original RiX definition.
e.run(`${marker}Square(x)->x*x;`);
equal(e.run('.Poly(.Spec(Square))(3);'),new Integer(9));
e.run('argumentCount:=0;Tick()->{; @argumentCount+=1;3};');
equal(e.run('Square(Tick());'),new Integer(9));equal(e.run('argumentCount;'),new Integer(1));
const loaded=e.load(`${marker}Live(x)->x+1;`);loaded.run();equal(e.run('Live(3);'),new Integer(4));
loaded.ir[1].args[2].fn='SUB';equal(e.run('Live(3);'),new Integer(2));
e.run(`${marker}Live(x)->x*3;`);equal(e.run('Live(3);'),new Integer(9));
e.run('mutable:=[1,2];');equal(e.run('Fast(mutable,1);'),new Integer(3));
e.context.get('mutable').values.push(new Integer(3));equal(e.run('Fast(mutable,1);'),new Integer(6));
// Calls (even in an untaken branch), prep, captures, aliasing and mutation refuse.
let effects=0;e.systemContext.registerHost('tick',{impl:()=>{effects++;return new Integer(7);}});
for(const body of ['(x)->.tick();','(x)->x>0 ?: x+1 ?_ .tick();','(x)->x+@argumentCount;','(x)->{; y=x;y+=1;y};','(x)->{; x+=1;x};','(xs)->xs.Map((x)->x*x);','(xs)->xs.Get(-1);','(x)->{@ i:=1;i<=x;i+=1;;};']) {
  e.run(`${marker}Unsupported${body}`);
  check(()=>assert.throws(()=>e.run('Unsupported(3);'),/ExactCore/));
}
check(()=>assert.equal(effects,0));
check(()=>assert.throws(()=>e.run(`${marker}Prep(x?=2)->x+1;`),/plain positional/));
check(()=>assert.throws(()=>e.load(`${marker}x:=1;`),/immediately precede/));
check(()=>assert.throws(()=>e.load(`${marker}## another comment\nOther(x)->x+1;`),/immediately precede/));
check(()=>assert.deepEqual(e.load('s:="## @exact-core";').markers,[]));
// Custom RiX arithmetic is intentionally outside this explicitly chosen core island.
e.registry.override('ADD',([a,b])=>new Integer(a.value+b.value+1n));
equal(e.run('Square(3);'),new Integer(9));equal(e.run('Fast([2,3,4],5);'),new Integer(69));e.registry.restore('ADD');
for(const custom of [Object.assign(new Integer(2),{_ext:new Map()}),new (class extends Integer {})(2)]) {
  e.context.set('custom',custom);check(()=>assert.throws(()=>e.run('Square(custom);'),/plain exact/));
}
let getters=0;const accessor=e.array([]);Object.defineProperty(accessor.values,'0',{get(){getters++;return new Integer(1);},configurable:true});
e.context.set('accessor',accessor);check(()=>assert.throws(()=>e.run('Fast(accessor,1);'),/data elements/));check(()=>assert.equal(getters,0));
const customArray=e.array([new Integer(1)]);customArray._ext.set('GET',{type:'method_builtin',impl:()=>{effects++;return new Integer(100);}});e.context.set('customarray',customArray);
check(()=>assert.throws(()=>e.run('Fast(customArray,1);'),/custom Array/));check(()=>assert.equal(effects,0));
e.context.setEnv('__trace_context__',{active:true});check(()=>assert.throws(()=>e.run('Square(3);'),/tracing/));e.context.env.delete('__trace_context__');
e.context.setEnv('__evaluation_budget__',{maxSteps:10000,maxTimeMs:null,deadline:null,signal:null,steps:0});check(()=>assert.throws(()=>e.run('Square(3);'),/budget/));e.context.env.delete('__evaluation_budget__');
e.context.setEnv('numInputBase',16);check(()=>assert.throws(()=>e.run('Square(3);'),/input base/));e.context.env.delete('numInputBase');
e.context.setEnv('defaultLoopMax',2);check(()=>assert.throws(()=>e.run('Fast([1,2,3],1);'),/max iteration count: 2/));e.context.env.delete('defaultLoopMax');
const add=Object.getOwnPropertyDescriptor(Integer.prototype,'add');Integer.prototype.add=function(x){return add.value.call(this,x);};
try {check(()=>assert.throws(()=>e.run('Square(3);'),/prototype changed/));} finally {Object.defineProperty(Integer.prototype,'add',add);}
const lenProto=e.array([])._ext.get('_proto'), oldLen=lenProto.entries.get('LEN');lenProto.entries.set('LEN',{...oldLen});
try {check(()=>assert.throws(()=>e.run('Fast([1],1);'),/prototype changed/));} finally {lenProto.entries.set('LEN',oldLen);}
e.run(`${marker}Divide(x)->1/x;`);const calls=e.stats.calls;check(()=>assert.throws(()=>e.run('Divide(0);'),/zero/i));check(()=>assert.equal(e.stats.calls,calls+1));
const bounded=await createMarkedExactSession({maxElements:3,maxBits:8,maxWork:20,maxCacheEntries:1});
bounded.run(`${marker}Fast${horner}\n${marker}Square(x)->x*x;`);
check(()=>assert.throws(()=>bounded.run('Fast([1,2,3,4],1);'),/element budget/));
check(()=>assert.throws(()=>bounded.run('Square(20);'),/bit budget/));
check(()=>assert.throws(()=>bounded.run('Fast([1,2,3],1);'),/operation budget/));
bounded.run('Square(2);');bounded.run('Fast([1],1);');check(()=>assert.ok(bounded.stats.evictions>0));
const off=await createMarkedExactSession();off.context.setEnv('symbolicAutoSpec','off');check(()=>assert.throws(()=>off.run(`${marker}S(x)->x*x;`),/symbolic spec/));
// Dynamic index/domain refusals use real arrays, not an unrelated type error.
e.run(`${marker}Read(xs,i)->xs.Get(i)+1;`);
for(const index of ['0','-1','3','1/2']) check(()=>assert.throws(()=>e.run(`Read([2,3],${index});`),/in-range positive Integer/));
equal(e.run('Read([2,3],2);'),new Integer(4));
e.run(`${marker}DividePlainly(x,y)->x/y;PlainDivide(x,y)->x/y;`);
for(const [a,b] of [['3','2'],['1/3','-7/5'],['0','3']]) equal(e.run(`DividePlainly(${a},${b});`),e.run(`PlainDivide(${a},${b});`));
const methodBase=e.registry.get('CALL_METHOD').impl;e.registry.override('CALL_METHOD',()=>new Integer(99));
try {check(()=>assert.throws(()=>e.run('Square(3);'),/structural registry/));} finally {e.registry.restore('CALL_METHOD');}
check(()=>assert.equal(e.registry.get('CALL_METHOD').impl,methodBase));
bounded.run(`${marker}Literal(x)->x+1000;`);check(()=>assert.throws(()=>bounded.run('Literal(1);'),/literal bit budget/));
// Load normal included plugins through the normal RiX host, then use the same code.
e.run('.Plugin.Load("poly");.Plugin.Load("stats");');
equal(e.run('Fast([2,3,4],5);'),new Integer(69));
equal(e.run('Plain([2,3,4],5);'),new Integer(69));
const report={timestamp:new Date().toISOString(),runtime:process.versions,checks,stats:e.stats,passed:true};
await writeFile(new URL(`./results/verification-${process.versions.bun?'bun':'node'}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
