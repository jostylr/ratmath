import { workloads } from '../integrated-core/workloads.js';
export { materialize } from '../integrated-core/workloads.js';
export async function fixtures(quick = false) {
  const result = (await workloads(quick)).filter(f => f.name.endsWith('horner'));
  const template = result.find(f => f.name === 'rational-coefficients-horner');
  const integer = result.find(f => f.name === 'integer-horner');
  result.push({ ...template, name: 'rational-coefficients-integer-points',
    data: { coefficients: template.data.coefficients, points: integer.data.points },
    dimensions: { ...template.dimensions, count: integer.data.points.values.length, rational: false, pointBits: 32 } });
  result.push({ ...integer, name: 'constant-rational-polynomial',
    data: { coefficients: { kind: 'sequence', values: [{ kind: 'Rational', numerator: '7', denominator: '11' }] }, points: template.data.points },
    dimensions: { degree: 0, count: template.data.points.values.length, rational: true, pointBits: 64 } });
  return result;
}
