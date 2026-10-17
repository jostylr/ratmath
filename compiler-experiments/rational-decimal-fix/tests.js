import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const build=JSON.parse(await readFile(new URL('./tmp/build.json',import.meta.url)));
const results=[];
for(const v of build.variants) for(const phase of ['before','after']) {
  const args=['test','./tests']; const start=performance.now();
  const r=spawnSync('bun',args,{cwd:v[phase],encoding:'utf8'});
  const output=r.stdout+r.stderr; const passed=Number(output.match(/(\d+) pass\b/)?.[1]||0),failed=Number(output.match(/(\d+) fail\b/)?.[1]||0);
  await writeFile(new URL(`./results/${v.name}-${phase}.txt`,import.meta.url),output);
  const expected=phase==='before'&&!v.alreadyFixed?failed===1&&output.includes('signed string construction'):r.status===0;
  const contracts=[];
  for(const runtime of ['bun','node']) {
    const c=spawnSync(runtime,[fileURLToPath(new URL('./contract.js',import.meta.url)),v[phase],...(phase==='before'&&!v.alreadyFixed?['--expect-bug']:[])],{encoding:'utf8'});
    contracts.push({runtime,exitCode:c.status,output:c.stdout+c.stderr});
  }
  const row={variant:v.name,phase,exitCode:r.status,passed,failed,wallMs:performance.now()-start,expected,contracts};
  results.push(row);console.log(JSON.stringify(row));
}
await writeFile(new URL('./results/tests.json',import.meta.url),JSON.stringify({timestamp:new Date().toISOString(),build,results},null,2)+'\n');
if(results.some(r=>!r.expected||r.contracts.some(c=>c.exitCode!==0)))process.exitCode=1;
