import assert from 'node:assert/strict';
export const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
export async function measure(groups, { rounds = 7, warmups = 2, targetMs = 15 } = {}) {
  for (const group of groups) {
    for (const v of group.variants) {
      group.check(v.run());
      let repeats = 1;
      for (let pass = 0; pass < 6; pass++) {
        const start = performance.now(); let result;
        for (let i = 0; i < repeats; i++) result = v.run();
        const elapsed = performance.now() - start; group.check(result);
        if (elapsed >= targetMs || repeats >= 4096) break;
        repeats = Math.min(4096, Math.max(repeats + 1, Math.ceil(repeats * targetMs / Math.max(elapsed, 0.01))));
      }
      v.repeats = repeats; v.samples = [];
      for (let j = 0; j < warmups; j++) { let result; for (let i = 0; i < repeats; i++) result = v.run(); group.check(result); }
    }
    for (let round = 0; round < rounds; round++) for (let offset = 0; offset < group.variants.length; offset++) {
      const v = group.variants[(offset + round) % group.variants.length], cpu = process.cpuUsage(), start = performance.now();
      let result;
      for (let i = 0; i < v.repeats; i++) result = v.run();
      const wallMs = performance.now() - start, usage = process.cpuUsage(cpu);
      v.samples.push({ batchMs: wallMs / v.repeats, wallMs, cpuMs: (usage.user + usage.system) / 1000 });
      group.check(result);
    }
    console.log(`Checked ${group.name}: ${group.variants.map(v => `${v.name} ${median(v.samples.map(s => s.batchMs)).toFixed(4)}ms`).join('; ')}`);
  }
  return groups.map(({ name, metadata, variants }) => ({ name, metadata, variants: variants.map(({ name, samples, repeats }) => ({ name, repeats,
    medianMs: median(samples.map(s => s.batchMs)), minMs: Math.min(...samples.map(s => s.batchMs)), maxMs: Math.max(...samples.map(s => s.batchMs)), samples })) }));
}
