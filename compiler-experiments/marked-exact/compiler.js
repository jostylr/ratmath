import {createHash} from 'node:crypto';
export class Ineligible extends Error {}
export const reject = message => { throw new Ineligible(`ExactCore: ${message}`); };
export function parameterNames(params) {
  if (!Array.isArray(params?.positional) || params.positional.some(p => typeof p.name !== 'string' || p.holeDefault !== null || p.isRest) ||
      ['keyword','conditionals','prep'].some(k => params[k]?.length) || params.prepStrict || Object.keys(params.metadata || {}).length) reject('plain positional parameters required');
  const names = params.positional.map(p => p.name);
  if (new Set(names).size !== names.length) reject('duplicate parameters');
  return names;
}
const arithmetic = {ADD:'add', SUB:'subtract', MUL:'multiply', DIV:'divide'};
const comparison = {LT:'lessThan', LTE:'lessThanOrEqual', GT:'greaterThan', GTE:'greaterThanOrEqual', EQ:'equals', NEQ:'notEquals'};
const unwrap = n => n?.fn === 'DEFER' ? n.args[0] : n;

// Translate real lowered RiX IR, never match the spelling of a known algorithm.
// Generated identifiers are serial numbers; source identifiers are only map keys.
export function compileFunction(params, body, kinds, {Integer,maxBits=16384}) {
  const names = parameterNames(params);
  if (kinds.length !== names.length) reject('arity mismatch');
  let serial = 0, nodes = 0, loops = 0;
  const fresh = () => `v${serial++}`;
  const scope = parent => ({parent, bindings:new Map()});
  const env = scope(null), constants = [];
  const bindings = names.map((name,i) => {
    const value = {code:fresh(), kind:kinds[i], parameter:true};
    env.bindings.set(name,value); return value;
  });
  const lookup = (s,name,outer=false) => {
    if (outer) { s=s.parent; while(s && !s.bindings.has(name)) s=s.parent; }
    const b=s?.bindings.get(name); if(!b) reject('implicit capture or unavailable local binding'); return b;
  };
  const expect = (v,kind) => { if(v.kind!==kind) reject(`expected ${kind}, got ${v.kind}`); return v; };
  function visit(n) {
    n=unwrap(n);
    if(!n || !Array.isArray(n.args) || ++nodes>2048) reject('invalid/oversized IR');
    return n;
  }
  function statement(n,s,initializing=false) {
    n=visit(n);
    if(n.fn==='HOLE') return '';
    if(n.fn==='SEQ') return n.args.map(x=>statement(x,s,initializing)).join('\n');
    if(!['ASSIGN','ASSIGN_COPY','ASSIGN_UPDATE'].includes(n.fn)) reject(`unsupported statement ${n.fn}`);
    const [name,rhs]=n.args;
    if(typeof name!=='string') reject('dynamic assignment');
    const previous=s.bindings.get(name);
    // '=' can alias RiX Cells. Decline that case rather than turn it into a
    // value assignment; numeric expressions and ':=' create private values.
    if(n.fn==='ASSIGN' && ['RETRIEVE','OUTER_RETRIEVE'].includes(unwrap(rhs)?.fn)) reject('cell alias assignment');
    if(previous?.parameter) reject('parameter mutation');
    if(previous && n.fn==='ASSIGN') reject('rebinding with =');
    if(!previous && (!initializing || n.fn==='ASSIGN_UPDATE')) reject('undeclared update');
    const value=expect(expression(rhs,s),'number');
    if(previous) return `${previous.code} = ${value.code};`;
    const b={code:fresh(),kind:'number'};s.bindings.set(name,b);
    return `let ${b.code} = ${value.code};`;
  }
  function expression(raw,s,shared=false) {
    const n=visit(raw), a=n.args;
    if(n.fn==='RETRIEVE' || n.fn==='OUTER_RETRIEVE') return lookup(s,a[0],n.fn==='OUTER_RETRIEVE');
    if(n.fn==='LITERAL') {
      if(a.length!==1 || !/^\d{1,64}$/.test(a[0])) reject('only bounded decimal integer literals');
      const value=BigInt(a[0]);if(value.toString(2).length>maxBits) reject('literal bit budget');
      constants.push(new Integer(value));
      return {code:`constants[${constants.length-1}]`,kind:'number'};
    }
    if(arithmetic[n.fn] || comparison[n.fn]) {
      if(a.length!==2) reject('binary arity');
      const x=expect(expression(a[0],s),'number'), y=expect(expression(a[1],s),'number');
      return {code:`op.${arithmetic[n.fn] || comparison[n.fn]}(${x.code}, ${y.code})`,kind:comparison[n.fn]?'boolean':'number'};
    }
    if(n.fn==='NEG' && a.length===1) return {code:`op.negate(${expect(expression(a[0],s),'number').code})`,kind:'number'};
    if(n.fn==='POW' && a.length===2 && a[1]?.fn==='LITERAL' && /^[0-8]$/.test(a[1].args[0]))
      return {code:`op.pow(${expect(expression(a[0],s),'number').code}, ${a[1].args[0]})`,kind:'number'};
    if(n.fn==='TERNARY' && a.length===4 && unwrap(a[3])?.fn==='UNDECIDED') {
      const test=expect(expression(a[0],s),'boolean'), yes=expect(expression(a[1],s),'number'), no=expect(expression(a[2],s),'number');
      return {code:`(${test.code} ? ${yes.code} : ${no.code})`,kind:'number'};
    }
    if(n.fn==='CALL_METHOD') {
      const values=expect(expression(a[0],s),'sequence');
      if(a[1]==='LEN' && a.length===2) return {code:`op.len(${values.code})`,kind:'number'};
      if(a[1]==='GET' && a.length===3) return {code:`op.get(${values.code}, ${expect(expression(a[2],s),'number').code})`,kind:'number'};
      reject('only checked Array.Len/Get supported');
    }
    if(['LOOP','BLOCK'].includes(n.fn)) {
      const scoped=!a[0]?.fn, meta=scoped?a[0]:{imports:[]}, parts=scoped?a.slice(1):a;
      if(!Array.isArray(meta?.imports) || Object.keys(meta).some(k=>k!=='imports') || (shared && meta.imports.length)) reject('unsupported scope metadata');
      const child=shared?s:scope(s), lines=[];
      for(const spec of meta.imports) {
        if(spec.mode!=='copy' || child.bindings.has(spec.local)) reject('only unique copied imports');
        const value=lookup(s,spec.source), b={code:fresh(),kind:value.kind};child.bindings.set(spec.local,b);
        lines.push(`let ${b.code} = ${value.code};`);
      }
      if(n.fn==='BLOCK') {
        if(!parts.length) reject('empty block');
        for(const x of parts.slice(0,-1)) lines.push(statement(x,child,true));
        const result=expression(parts.at(-1),child);
        lines.push(`return ${result.code};`);
        return {code:`(() => {\n${lines.join('\n')}\n})()`,kind:result.kind};
      }
      if(parts.length!==5 || unwrap(parts[4])?.fn==='HOLE') reject('loop requires explicit final result');
      const [init,condition,body,update,after]=parts;
      lines.push(statement(init,child,true));
      const test=expect(expression(condition,child,true),'boolean'), step=statement(body,child), advance=statement(update,child);
      const counter=fresh();loops++;
      lines.push(`let ${counter} = 0;`, `while (${test.code}) {`, `op.iteration(${counter}++);`, step, advance, '}');
      const result=expression(after,child,true);lines.push(`return ${result.code};`);
      return {code:`(() => {\n${lines.join('\n')}\n})()`,kind:result.kind};
    }
    reject(`unsupported IR ${n.fn}`);
  }
  const result=expect(expression(body,env,true),'number');
  const source=`"use strict";\nreturn (${bindings.map(b=>b.code).join(', ')}) => ${result.code};`;
  const factory=new Function('op','constants',source);
  return {source,loops,nodes,sourceHash:createHash('sha256').update(JSON.stringify([params,body,kinds])).digest('hex'),instantiate:op=>factory(op,constants)};
}
