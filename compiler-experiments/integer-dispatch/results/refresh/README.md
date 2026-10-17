# Refreshed benchmarks: Bun 1.4.3 and Node 26.12.0

The original harnesses and fixtures were rerun sequentially. Historical report files were restored unchanged. Runtime differences below are observations from single processes; they do not isolate the runtime update from noise or machine state.

## integrated-core

| Runtime | Workload / path | Earlier ms | Updated ms | Earlier / updated |
|---|---|---:|---:|---:|
| bun | rational-horner / candidate | 2.7207 | 2.8582 | 0.95× |
| bun | larger-rational-horner / candidate | 13.4471 | 13.9841 | 0.96× |
| bun | binary-modular-powers / candidate-wired | 10.7420 | 9.9729 | 1.08× |
| node | rational-horner / candidate | 7.0004 | 7.1121 | 0.98× |
| node | larger-rational-horner / candidate | 41.1607 | 41.7155 | 0.99× |
| node | binary-modular-powers / candidate-wired | 16.2731 | 16.4225 | 0.99× |

Full reports: [Bun](integrated-core-bun.md) ([JSON](integrated-core-bun.json)); [Node](integrated-core-node.md) ([JSON](integrated-core-node.json)).

## polynomial-core

| Runtime | Workload / path | Earlier ms | Updated ms | Earlier / updated |
|---|---|---:|---:|---:|
| bun | integer-horner / RiX Horner, fast core | 3.1292 | 2.8358 | 1.10× |
| bun | rational-horner / RiX fused batch | 0.2237 | 0.2000 | 1.12× |
| bun | larger-rational-horner / RiX fused batch | 0.7084 | 0.6265 | 1.13× |
| node | integer-horner / RiX Horner, fast core | 3.4212 | 3.3331 | 1.03× |
| node | rational-horner / RiX fused batch | 0.2873 | 0.2850 | 1.01× |
| node | larger-rational-horner / RiX fused batch | 1.7881 | 1.7672 | 1.01× |

Full reports: [Bun](polynomial-core-bun.md) ([JSON](polynomial-core-bun.json)); [Node](polynomial-core-node.md) ([JSON](polynomial-core-node.json)).

## interpreter-overhead

| Runtime | Workload / path | Earlier ms | Updated ms | Earlier / updated |
|---|---|---:|---:|---:|
| bun | integer-horner / literals | 2.5365 | 2.6589 | 0.95× |
| bun | rational-horner / literals | 1.0159 | 0.9976 | 1.02× |
| bun | larger-rational-horner / literals | 1.3902 | 1.4915 | 0.93× |
| node | integer-horner / literals | 2.8282 | 2.9297 | 0.97× |
| node | rational-horner / literals | 1.1478 | 1.2046 | 0.95× |
| node | larger-rational-horner / literals | 2.5501 | 2.6571 | 0.96× |

Full reports: [Bun](interpreter-overhead-bun.md) ([JSON](interpreter-overhead-bun.json)); [Node](interpreter-overhead-node.md) ([JSON](interpreter-overhead-node.json)).
