import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const build=JSON.parse(await readFile(new URL('../metadata-cache/tmp/build.json',import.meta.url)));
const files=['cells','constructor-capture','shared-scope','function-return','methods','operator-dispatch','custom-operators','semantic-operators','numeric-regressions','scoped-spec'];
const results=[];
for(const [name,cwd,args] of [
  ['rix-related',build.paths.cached.rix,files.map(f=>`./tests/eval/${f}.test.js`)],
  ['core-unchanged',build.paths.cached.core,['./tests']]
]) {
  const start=performance.now(),p=spawnSync('bun',['test',...args],{cwd,encoding:'utf8',maxBuffer:8*1024*1024});
  const output=(p.stdout||'')+(p.stderr||'');
  const row={name,command:['bun','test',...args],exitCode:p.status,passed:Number(output.match(/(\d+) pass\b/)?.[1]||0),failed:Number(output.match(/(\d+) fail\b/)?.[1]||0),wallMs:performance.now()-start};
  results.push(row);console.log(JSON.stringify(row));
  await writeFile(new URL(`./results/${name}.txt`,import.meta.url),output);
}
await writeFile(new URL('./results/tests.json',import.meta.url),JSON.stringify({timestamp:new Date().toISOString(),note:'Existing tests run against the isolated current-source copy. Marker-specific differential tests are in verify.js. Production sources unchanged.',results},null,2)+'\n');
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
