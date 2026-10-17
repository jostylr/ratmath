import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileCallback,Ineligible} from './compiler.js';
import {load} from '../metadata-cache/load.js';
export {Ineligible};
const ownDescriptors=object=>Reflect.ownKeys(object).map(key=>[key,Object.getOwnPropertyDescriptor(object,key)]);
function unchanged(object,snapshot) {
 const now=Reflect.ownKeys(object);if(now.length!==snapshot.length)return false;
 return snapshot.every(([key,d])=>{const n=Object.getOwnPropertyDescriptor(object,key);return n&&['value','get','set','enumerable','configurable','writable'].every(k=>n[k]===d[k]);});
}
export async function createExactSession({maxElements=65536,maxWork=1_000_000,maxBits=16384,maxCacheEntries=64}={}) {
 for(const [key,n]of Object.entries({maxElements,maxWork,maxBits,maxCacheEntries}))if(!Number.isSafeInteger(n)||n<1)throw new RangeError(`Positive ${key} required`);
 const env=await load('cached'),{Integer,Rational}=env.core,{rix}=env;
 const {callWithConcreteArgs}=await import(pathToFileURL(resolve(env.paths.rix,'src/eval/functions/functions.js')));
 const session=env.makeSession(),{registry,context}=session;
 const capabilities=session.systemContext.copy();session.systemContext=capabilities;
 const stats={compileMs:0,compiles:0,cacheHits:0,evictions:0,compiledFolds:0,interpretedFolds:0,polynomialBatches:0,momentCalls:0,reasons:{}};
 const cache=new Map(),corePrototypes=[Integer.prototype,Rational.prototype].map(p=>[p,ownDescriptors(p)]);
 const operatorBaseline=new Map();
 for(const name of ['ADD','SUB','MUL','DIV','NEG','POW']) {
  const e=registry.get(name);operatorBaseline.set(name,{entry:e,entryFields:ownDescriptors(e),variants:e.variants,variantArray:e.variants?ownDescriptors(e.variants):null,variantFields:(e.variants||[]).map(v=>[v,ownDescriptors(v)])});
 }
 const arrayFactory=registry.get('ARRAY').impl;
 const array=values=>{const a=arrayFactory([],new rix.Context(),x=>x);a.values=values;return a;};
 const error=message=>new Ineligible(`ExactLoop: ${message}`);
 const reject=message=>{throw error(message);};
 function scalar(value,discardMetadata=false) {
  if(!value||![Integer.prototype,Rational.prototype].includes(Object.getPrototypeOf(value)))reject('plain exact Integer/Rational values required');
  const keys=Reflect.ownKeys(value);
  if(keys.length && !(discardMetadata && keys.length===1 && keys[0]==='_ext' && Object.getOwnPropertyDescriptor(value,'_ext')?.value instanceof Map))reject('plain exact Integer/Rational values required');
  const nums=value instanceof Integer?[value.value]:[value.numerator,value.denominator];
  if(nums.some(n=>(n<0n?-n:n).toString(2).length>maxBits))reject('numeric bit budget');
  return value;
 }
 function eagerValues(sequence) {
  if(!sequence||Object.getPrototypeOf(sequence)!==Object.prototype)reject('ordinary eager Array required');
  const d=Object.getOwnPropertyDescriptors(sequence);
  if(d.type?.value!=='sequence'||!Array.isArray(d.values?.value)||Reflect.ownKeys(sequence).some(k=>!['type','values','_ext'].includes(k)))reject('ordinary eager Array required');
  const values=d.values.value;
  if(values.length>maxElements)reject('element budget');
  return values;
 }
 function snapshot(sequence,discardMetadata=false) {
  const values=eagerValues(sequence);
  // Reject sparse/accessor arrays before reading elements. The private copy
  // prevents a cached kernel from retaining a caller's mutable collection.
  const copy=[];
  for(let i=0;i<values.length;i++) {
   const descriptor=Object.getOwnPropertyDescriptor(values,String(i));
   if(!descriptor||!('value'in descriptor))reject('dense data elements required');
   const v=scalar(descriptor.value,discardMetadata);copy.push(v instanceof Integer?new Integer(v.value):new Rational(v));
  }
  return copy;
 }
 function executionGuard(ctx) {
  if(corePrototypes.some(([p,s])=>!unchanged(p,s)))reject('core prototype changed');
  if(ctx.getEnv('__trace_context__')?.active)reject('active tracing requires interpretation');
  if(ctx.getEnv('__evaluation_budget__',null))reject('active evaluator budget requires interpretation');
 }
 function operatorGuard(operations) {
  for(const name of operations){const b=operatorBaseline.get(name),e=registry.get(name);if(e!==b.entry||!unchanged(e,b.entryFields)||e.variants!==b.variants||(b.variants&&!unchanged(e.variants,b.variantArray))||b.variantFields.some(([v,s])=>!unchanged(v,s)))reject('custom operator registry requires interpretation');}
 }
 function compile(fn,arity) {
  // Include live body/params, so mutation/redefinition cannot reuse stale code.
  let key;try{key=JSON.stringify([fn?.params,fn?.body,arity]);}catch{reject('nonserializable callback');}
  if(!key||key.length>32768)reject('callback size budget');
  const prior=cache.get(key);if(prior){stats.cacheHits++;cache.delete(key);cache.set(key,prior);return prior;}
  const start=performance.now();const code=compileCallback(fn,arity,{Integer});stats.compileMs+=performance.now()-start;stats.compiles++;
  if(cache.size>=maxCacheEntries){cache.delete(cache.keys().next().value);stats.evictions++;}
  cache.set(key,code);return code;
 }
 function execution(ctx,estimated) {
  executionGuard(ctx);if(estimated>maxWork)reject('operation budget');let work=0;
  const check=value=>{if(++work>maxWork)reject('operation budget');return scalar(value);};
  return {add:(a,b)=>check(a.add(b)),subtract:(a,b)=>check(a.subtract(b)),multiply:(a,b)=>check(a.multiply(b)),divide:(a,b)=>check(a.divide(b)),negate:a=>check(a.negate()),pow:(a,n)=>check(a.pow(n))};
 }
 function strictFold(values,initial,fn,extras,ctx,{transparent=false}={}) {
  executionGuard(ctx);const xs=snapshot(values),args=extras?snapshot(extras):[];scalar(initial);
  const compiled=compile(fn,2+args.length);if(transparent)operatorGuard(compiled.operations);
  const op=execution(ctx,xs.length*compiled.work),step=compiled.instantiate(op);
  let accumulator=initial instanceof Integer?new Integer(initial.value):new Rational(initial);
  // No callback effects are possible here. Arithmetic errors propagate once;
  // this function never restarts a failed loop via the interpreter.
  stats.compiledFolds++;
  for(const value of xs)accumulator=step(accumulator,value,...args);
  return accumulator;
 }
 function tryFold(values,initial,fn,extras,ctx,evaluate) {
  // All eligibility checks precede execution. A refusal may choose ordinary
  // interpretation; a computation failure never causes an effectful retry.
  eagerValues(values);if(extras!==undefined&&extras!==null)eagerValues(extras);
  let xs,args,compiled;
  try {
   executionGuard(ctx);xs=snapshot(values);args=extras?snapshot(extras):[];scalar(initial);
   compiled=compile(fn,2+args.length);operatorGuard(compiled.operations);
   if(xs.length*compiled.work>maxWork)reject('operation budget');
  } catch(e) {
   if(!(e instanceof Ineligible))throw e;
   stats.interpretedFolds++;stats.reasons[e.message]=(stats.reasons[e.message]||0)+1;
   const items=eagerValues(values).slice(),explicit=extras?eagerValues(extras).slice():[];let accumulator=initial;
   // This is an explicit ordered eager fold API, not a rewrite of custom Reduce.
   for(const value of items)accumulator=callWithConcreteArgs(fn,[accumulator,value,...explicit],ctx,evaluate);
   return accumulator;
  }
  const step=compiled.instantiate(execution(ctx,xs.length*compiled.work));stats.compiledFolds++;
  let accumulator=initial instanceof Integer?new Integer(initial.value):new Rational(initial);
  for(const value of xs)accumulator=step(accumulator,value,...args);
  return accumulator;
 }
 function polynomialBatch(coefficients,points,ctx) {
  executionGuard(ctx);const cs=snapshot(coefficients),xs=snapshot(points),op=execution(ctx,cs.length*xs.length*2);
  stats.polynomialBatches++;
  return array(xs.map(x=>{let y=new Integer(0);for(const c of cs)y=op.add(op.multiply(y,x),c);return y;}));
 }
 function moments(values,ctx,meanOnly=false) {
  executionGuard(ctx);const xs=snapshot(values);if(!xs.length)throw new RangeError('Statistics requires at least one value');
  stats.momentCalls++;
  const op=execution(ctx,xs.length*(meanOnly?1:4)+(meanOnly?1:2)),data=xs.map(x=>x instanceof Integer?new Rational(x):x);
  let sum=new Rational(0);for(const x of data)sum=op.add(sum,x);
  const count=new Integer(data.length),mean=op.divide(sum,count);if(meanOnly)return mean;
  let squared=new Rational(0);for(const x of data){const d=op.subtract(x,mean);squared=op.add(squared,op.pow(d,2));}
  return {type:'map',entries:new Map([['count',count],['mean',mean],['variance',op.divide(squared,count)]])};
 }
 const methods=new Map();
 const add=(name,impl)=>methods.set(name,{type:'method_builtin',name,impl:([self,...args],ctx,evaluate)=>impl(args,ctx,evaluate)});
 add('SNAPSHOT',([values],ctx)=>{executionGuard(ctx);return array(snapshot(values,true));});
 add('FOLD',([values,initial,callback,extras],ctx)=>strictFold(values,initial,callback,extras,ctx));
 add('TRYFOLD',([values,initial,callback,extras],ctx,evaluate)=>tryFold(values,initial,callback,extras,ctx,evaluate));
 add('POLYNOMIALBATCH',([coefficients,points],ctx)=>polynomialBatch(coefficients,points,ctx));
 add('MEAN',([values],ctx)=>moments(values,ctx,true));add('MOMENTS',([values],ctx)=>moments(values,ctx));
 capabilities.registerHostValue('exactLoop',{type:'map',entries:new Map(),_ext:methods},{doc:'Experimental explicit exact-core numeric loop boundary',groups:['Experimental']});capabilities.registerGroup('Experimental',['exactLoop']);capabilities.freeze();
 const run=source=>rix.parseAndEvaluate(source,session);
 const parse=source=>rix.lower(rix.parse(source));
 const evaluate=ir=>{let result;for(const node of ir)result=rix.evaluate(node,context,registry,capabilities);return result;};
 return {...env,...session,stats,run,parse,evaluate,array,inspect:()=>[...cache.values()].map(({instantiate,...code})=>code),kernel:{fold:strictFold,polynomialBatch,moments}};
}
