import {createHash} from 'node:crypto';
const binary={ADD:'add',SUB:'subtract',MUL:'multiply',DIV:'divide'};
export class Ineligible extends Error {}
const fail=message=>{throw new Ineligible(message);};
// Compile real RiX expression IR. Only generated p0/p1 names enter JS source.
export function compileCallback(fn,arity,{Integer}) {
 if(!['lambda','function'].includes(fn?.type))fail('ordinary RiX callback required');
 const p=fn.params;
 if(!p?.positional||p.positional.length!==arity||p.positional.some(x=>x.holeDefault!==null||x.isRest)||
    ['keyword','conditionals','prep'].some(k=>p[k]?.length)||p.prepStrict||Object.keys(p.metadata||{}).length)fail('plain positional parameters required');
 const names=p.positional.map(x=>x.name);if(new Set(names).size!==arity)fail('duplicate parameter');
 const constants=[],operations=new Set();let nodes=0,work=0;
 function emit(node) {
  if(!node||!Array.isArray(node.args)||++nodes>128)fail('expression size limit');
  const a=node.args;
  if(node.fn==='RETRIEVE') {
   const i=names.indexOf(a[0]);if(i<0)fail('implicit closure capture; pass it explicitly');return `p${i}`;
  }
  if(node.fn==='LITERAL') {
   if(a.length!==1||!/^\d{1,64}$/.test(a[0]))fail('bounded decimal Integer literals only');
   constants.push(new Integer(BigInt(a[0])));return `constants[${constants.length-1}]`;
  }
  if(binary[node.fn]&&a.length===2){operations.add(node.fn);work++;return `op.${binary[node.fn]}(${emit(a[0])},${emit(a[1])})`;}
  if(node.fn==='NEG'&&a.length===1){operations.add('NEG');work++;return `op.negate(${emit(a[0])})`;}
  if(node.fn==='POW'&&a.length===2&&a[1]?.fn==='LITERAL'&&/^[0-8]$/.test(a[1].args[0])){
   operations.add('POW');work++;return `op.pow(${emit(a[0])},${a[1].args[0]})`;
  }
  fail(`unsupported kernel expression ${node.fn}`);
 }
 const expression=emit(fn.body);
 if(!work)fail('identity/constant callbacks retain interpreter value semantics');
 const source=`return (${names.map((_,i)=>`p${i}`).join(',')}) => ${expression};`;
 const factory=new Function('op','constants',source);
 const sourceHash=createHash('sha256').update(JSON.stringify([fn.params,fn.body])).digest('hex');
 return {source,sourceHash,operations:[...operations],work,instantiate:op=>factory(op,constants)};
}
