import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { load,canonical } from './load.js';
import { fixtures,materialize } from '../polynomial-core/fixtures.js';
const source=await readFile(new URL('../integrated-core/scripts/horner.rix',import.meta.url),'utf8');
const envs=await Promise.all(['counts-control','counts-literals'].map(load)),results=[];
for(const f of await fixtures()) {
  let expected;
  const variants=[];
  for(const env of envs) {
    const ir=env.parse(source),data=materialize(f.data,env.core);
    env.probes.reset();
    const value=env.run(ir,data),diagnostics=env.probes.stop();
    if(expected===undefined) expected=canonical(value);else assert.deepEqual(canonical(value),expected);
    variants.push({variant:env.variant,...diagnostics});
  }
  results.push({name:f.name,dimensions:f.dimensions,variants});
}
const report={timestamp:new Date().toISOString(),runtime:process.versions.bun?'bun':'node',method:'One complete fresh RiX evaluation per instrumented copy; setup/parse excluded. Counters are diagnostic, never benchmark timing.',results};
await writeFile(new URL('./results/counts.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
for(const g of results) console.log(JSON.stringify({name:g.name,variants:g.variants.map(v=>({variant:v.variant,RationalCopies:(v.counts['copy.shallow.Rational']||0)+(v.counts['copy.deep.Rational']||0),normalizationGCDs:v.counts['core.Rational.gcd']||0,coreParses:v.counts['core.parseNumber']||0,variantProbes:v.counts['variant.prep'],maxCopiedNumeratorBits:v.rationalCopyBits.maxNumerator}))}));
