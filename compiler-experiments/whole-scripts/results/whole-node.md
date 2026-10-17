# Whole-script comparison

Node 26.10.0, Apple M4 Pro; 5 samples after a warm run.

| Workload | RiX ms | Tuned JS ms | Native ms | RiX / JS | JS / Native |
|---|---:|---:|---:|---:|---:|
| modular-powers | 4708.671 | 39.534 | 15.248 | 119.10× | 2.59× |
| async-microtasks | 40.741 | 0.573 | 2.677 | 71.13× | 0.21× |
| async-host-latency | 344.726 | 321.079 | 322.679 | 1.07× | 1.00× |

Selected JavaScript arithmetic algorithm: montgomery-5. Fresh native preparation: 296.92 ms.

Complete measurements, diagnostics, compilation/parse costs, source/input/result digests and host-wait timings are in the matching JSON report.
