import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {variants} from './build.js';
const build=JSON.parse(await readFile(new URL('./tmp/build.json',import.meta.url)));
const files=['methods','operator-dispatch','custom-operators','semantic-operators','type-system','identity-comparison','cells','constructor-capture','numeric-regressions','range-arithmetic','async-method-callbacks','function-return','number-notation','diagnostics'];
const results=[];
const requested=process.argv.find(a=>a.startsWith('--variants='))?.slice(11).split(',');
if(requested&&requested.some(v=>!variants.includes(v)))throw new Error('Unknown requested variant');
async function run(name,args,cwd){
 let output='';const start=performance.now();
 const exitCode=await new Promise((done,reject)=>{const c=spawn('bun',['test',...args],{cwd,env:process.env});c.stdout.on('data',d=>{output+=d;});c.stderr.on('data',d=>{output+=d;});c.on('error',reject);c.on('close',done);});
 await writeFile(new URL(`./results/${name}.txt`,import.meta.url),output);
 const r={name,exitCode,passed:Number(output.match(/(\d+) pass\b/)?.[1]||0),failed:Number(output.match(/(\d+) fail\b/)?.[1]||0),wallMs:performance.now()-start,command:['bun','test',...args]};
 results.push(r);console.log(JSON.stringify(r));console.log(output.split('\n').slice(exitCode===0?-7:-45).join('\n'));
}
const previous=requested?JSON.parse(await readFile(new URL('./results/tests.json',import.meta.url))):null;
if(!requested)await run('core-unchanged',['./tests'],build.paths.comparisons.core);
const selected=requested||variants;
if(process.argv.includes('--parallel'))await Promise.all(selected.map(v=>run(`rix-${v}`,files.map(f=>`./tests/eval/${f}.test.js`),build.paths[v].rix)));
else for(const v of selected)await run(`rix-${v}`,files.map(f=>`./tests/eval/${f}.test.js`),build.paths[v].rix);
const combined=previous?[...previous.results.filter(r=>!results.some(n=>n.name===r.name)),...results]:results;
await writeFile(new URL('./results/tests.json',import.meta.url),JSON.stringify({timestamp:new Date().toISOString(),files,results:combined},null,2)+'\n');
if(combined.some(r=>r.exitCode!==0))process.exitCode=1;
