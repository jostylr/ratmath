import {createExactSession} from '../direct-loops/engine.js';
import {compileFunction,parameterNames,reject,Ineligible} from './compiler.js';
export {Ineligible};
const BODY='EXPERIMENT_EXACT_CORE_BODY';
const descriptors=o=>Reflect.ownKeys(o).map(k=>[k,Object.getOwnPropertyDescriptor(o,k)]);
const unchanged=(o,ds)=>Reflect.ownKeys(o).length===ds.length && ds.every(([k,d])=>{
  const now=Object.getOwnPropertyDescriptor(o,k);
  return now && ['value','get','set','enumerable','configurable','writable'].every(p=>now[p]===d[p]);
});
export async function createMarkedExactSession(options={}) {
  const limits={maxElements:65536,maxWork:1_000_000,maxBits:16384,maxCacheEntries:64,...options};
  for(const n of Object.values(limits)) if(!Number.isSafeInteger(n)||n<1) throw new RangeError('Positive safe integer limits required');
  // Fold and marked functions deliberately use the SAME copied RiX/core modules.
  const e=await createExactSession(limits), {Integer,Rational}=e.core;
  // Install the same system lookup/plugin loader environment as ordinary RiX.
  // Omitting this makes an interpreter control unfairly bypass system dispatch.
  e.run('');
  const prototypes=[Integer.prototype,Rational.prototype].map(p=>[p,descriptors(p)]);
  const ordinary=e.array([]), defaultProto=ordinary._ext.get('_proto');
  const protoEntries=[...defaultProto.entries], methodFields=protoEntries.map(([,m])=>[m,descriptors(m)]);
  const records=new WeakMap(), cache=new Map();
  const stats={calls:0,compiles:0,cacheHits:0,evictions:0,compiledCalls:0,rejections:0,compileMs:0};
  function scalar(value) {
    if(!value || ![Integer.prototype,Rational.prototype].includes(Object.getPrototypeOf(value)) || Reflect.ownKeys(value).length) reject('plain exact Integer/Rational required');
    const nums=value instanceof Integer?[value.value]:[value.numerator,value.denominator];
    if(nums.some(n=>(n<0n?-n:n).toString(2).length>limits.maxBits)) reject('numeric bit budget');
    return value;
  }
  const copy=value=>value instanceof Integer?new Integer(value.value):new Rational(value);
  function input(value) {
    if(value instanceof Integer || value instanceof Rational) return {kind:'number',value:copy(scalar(value))};
    if(!value || Object.getPrototypeOf(value)!==Object.prototype) reject('ordinary eager numeric Array required');
    const ds=Object.getOwnPropertyDescriptors(value);
    if(Reflect.ownKeys(value).some(k=>!['type','values','_ext'].includes(k)) || ds.type?.value!=='sequence' || !Array.isArray(ds.values?.value)) reject('ordinary eager numeric Array required');
    const ext=ds._ext?.value;
    if(ds._ext && !(ext instanceof Map && Object.getPrototypeOf(ext)===Map.prototype && [...ext.keys()].every(k=>['_mutable','_proto','_type'].includes(k)) &&
       (!ext.has('_proto') || ext.get('_proto')===defaultProto) &&
       (!ext.has('_type') || (ext.get('_type')?.type==='string' && ext.get('_type').value==='array')))) reject('custom Array metadata/methods');
    const xs=ds.values.value;
    if(Object.getPrototypeOf(xs)!==Array.prototype || Reflect.ownKeys(xs).length!==xs.length+1) reject('plain dense Array storage required');
    if(xs.length>limits.maxElements) reject('element budget');
    const values=[];
    for(let i=0;i<xs.length;i++) {
      const d=Object.getOwnPropertyDescriptor(xs,String(i));
      if(!d || !('value'in d)) reject('dense data elements required');
      values.push(copy(scalar(d.value)));
    }
    return {kind:'sequence',value:values};
  }
  const define=e.registry.get('FUNCDEF').impl;
  e.registry.override('FUNCDEF',(args,ctx,evaluate)=>{
    const record=records.get(args[2]);
    if(record) {
      parameterNames(args[1]);
      if([false,'off','none'].includes(ctx.getEnv('symbolicAutoSpec',e.rix.runtimeDefaults.symbolicAutoSpec))) reject('automatic symbolic spec must remain enabled');
    }
    // Preserve RiX's original symbolic spec, dispatch and argument binding.
    const fn=define(args,ctx,evaluate);
    if(record) fn.body={fn:BODY,args:[record],pos:args[2].pos};
    return fn;
  });
  const structural=['FUNCDEF','CALL','CALL_METHOD','LOOP','BLOCK','ASSIGN','ASSIGN_COPY','ASSIGN_UPDATE','RETRIEVE','OUTER_RETRIEVE','LITERAL'];
  const registryBaseline=structural.map(name=>{const v=e.registry.get(name);return [name,v,descriptors(v),v.variants, v.variants?descriptors(v.variants):null,(v.variants||[]).map(x=>[x,descriptors(x)])];});
  function guard(ctx) {
    if(prototypes.some(([p,ds])=>!unchanged(p,ds))) reject('core prototype changed');
    if(ctx.getEnv('__trace_context__')?.active) reject('active tracing requires interpretation');
    if(ctx.getEnv('__evaluation_budget__',null)) reject('active evaluator budget requires interpretation');
    if(ctx.getEnv('numInputBase')!==undefined) reject('custom literal input base');
    if(ctx.getEnv('defaultConstructorCaptureMode',e.rix.runtimeDefaults.defaultConstructorCaptureMode)!=='deep_copy') reject('custom constructor capture mode');
    if(registryBaseline.some(([name,v,ds,vs,vds,items])=>e.registry.get(name)!==v || !unchanged(v,ds) || v.variants!==vs || (vs&&!unchanged(vs,vds)) || items.some(([x,d])=>!unchanged(x,d)))) reject('custom structural registry');
    if(defaultProto.entries.size!==protoEntries.length || protoEntries.some(([k,v])=>defaultProto.entries.get(k)!==v) || methodFields.some(([v,d])=>!unchanged(v,d))) reject('Array method prototype changed');
    if(['LEN','GET'].some(name=>e.systemContext.resolveMethodExtension(['Array','Sequence'],name))) reject('custom Array method extension');
    const max=ctx.getEnv('defaultLoopMax',e.rix.runtimeDefaults.defaultLoopMax);
    if(!Number.isSafeInteger(max)||max<1) reject('finite positive loop limit required');
    return max;
  }
  function operations(maxIterations) {
    let work=0;
    const tick=()=>{if(++work>limits.maxWork) reject('operation budget');};
    const check=v=>{tick();return scalar(v);};
    const op={
      add:(a,b)=>check(a.add(b)),subtract:(a,b)=>check(a.subtract(b)),multiply:(a,b)=>check(a.multiply(b)),divide:(a,b)=>check(a.divide(b)),
      negate:a=>check(a.negate()),pow:(a,n)=>check(a.pow(n)),
      len:xs=>check(new Integer(xs.length)),
      get:(xs,i)=>{
        tick();
        if(!(i instanceof Integer) || i.value<1n || i.value>BigInt(xs.length)) reject('Get requires an in-range positive Integer index');
        return xs[Number(i.value)-1];
      },
      iteration:n=>{tick();if(n>=maxIterations) throw new Error(`Loop exceeded max iteration count: ${maxIterations}`);}
    };
    for(const name of ['lessThan','lessThanOrEqual','greaterThan','greaterThanOrEqual','equals']) op[name]=(a,b)=>{tick();if(a instanceof Rational || b instanceof Rational) {a=a instanceof Rational?a:new Rational(a);b=b instanceof Rational?b:new Rational(b);}return a[name](b);};
    op.notEquals=(a,b)=>!op.equals(a,b);
    return op;
  }
  e.registry.register(BODY,([record],ctx)=>{
    stats.calls++;
    try {
      const max=guard(ctx), names=parameterNames(record.params);
      const values=names.map(name=>input(ctx.get(name))), kinds=values.map(x=>x.kind);
      const key=JSON.stringify([record.params,record.body,kinds]);
      if(key.length>65536) reject('definition size budget');
      let compiled=cache.get(key);
      if(compiled) { stats.cacheHits++;cache.delete(key);cache.set(key,compiled); }
      else {
        const start=performance.now();
        try { compiled=compileFunction(record.params,record.body,kinds,{Integer,maxBits:limits.maxBits}); }
        finally { stats.compileMs+=performance.now()-start; }
        stats.compiles++;
        if(cache.size>=limits.maxCacheEntries) {cache.delete(cache.keys().next().value);stats.evictions++;}
        cache.set(key,compiled);
      }
      // The whitelist has checked the ENTIRE body before any loop can run.
      // Errors, including dynamic numeric bounds, propagate once. Never retry.
      const result=compiled.instantiate(operations(max))(...values.map(x=>x.value));
      scalar(result);stats.compiledCalls++;
      return copy(result);
    } catch(error) { if(error instanceof Ineligible)stats.rejections++;throw error; }
  },{lazy:true});
  function load(source) {
    if(typeof source!=='string' || Buffer.byteLength(source)>256*1024) throw new RangeError('RiX source must be <=256 KiB');
    const ast=e.rix.parse(e.rix.tokenize(source)), ir=e.rix.lower(ast), markers=[];
    ast.forEach((node,i)=>{
      if(node.type!=='Comment' || node.value.trim()!=='@exact-core') return;
      const next=ast[i+1], definition=ir[i+1];
      if(next?.expression?.type!=='FunctionDefinition' || definition?.fn!=='FUNCDEF' || !/^\s*$/.test(source.slice(node.pos[2],next.pos[1])))
        throw new SyntaxError('@exact-core must immediately precede a top-level function definition');
      const [name,params,body]=definition.args;
      records.set(body,{name,params,body});markers.push(name);
    });
    return {ir,markers,run:()=>e.evaluate(ir)};
  }
  return {...e,foldStats:e.stats,stats,load,run:source=>load(source).run(),inspect:()=>[...cache.values()].map(({instantiate,...code})=>code),inspectFolds:e.inspect};
}
