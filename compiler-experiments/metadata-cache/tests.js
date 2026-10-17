import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const build=JSON.parse(await readFile(new URL('./tmp/build.json',import.meta.url)));
const files=['methods','operator-dispatch','custom-operators','semantic-operators','type-system','identity-comparison','cells','constructor-capture','numeric-regressions','range-arithmetic','async-method-callbacks','function-return','number-notation','diagnostics','plugin-catalog'];
const results=[];
function run(name,paths,args) {
 const start=performance.now();const p=spawnSync('bun',['test',...args],{cwd:paths,encoding:'utf8',maxBuffer:8*1024*1024});
 const output=(p.stdout||'')+(p.stderr||'');
 const row={name,command:['bun','test',...args],exitCode:p.status,passed:Number(output.match(/(\d+) pass\b/)?.[1]||0),failed:Number(output.match(/(\d+) fail\b/)?.[1]||0),wallMs:performance.now()-start};
 results.push(row);console.log(JSON.stringify(row));return writeFile(new URL(`./results/${name}.txt`,import.meta.url),output);
}
for(const v of ['baseline','cached'])await run(`rix-${v}`,build.paths[v].rix,[...files.map(f=>`./tests/eval/${f}.test.js`),'./tests/parser/custom-operators.test.js']);
await run('plugins-cached',build.paths.cached.rix,['./tests/eval/poly-plugin.test.js','./tests/eval/stats-complex-gif-plugin.test.js','./tests/eval/linalg-optimize-solve-plugin.test.js']);
await run('core-unchanged',build.paths.cached.core,['./tests']);
await writeFile(new URL('./results/tests.json',import.meta.url),JSON.stringify({timestamp:new Date().toISOString(),files,results},null,2)+'\n');
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
