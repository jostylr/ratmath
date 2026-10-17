# Whole-script comparison

Bun 1.4.0, Apple M4 Pro; 5 samples after a warm run.

| Workload | RiX ms | Tuned JS ms | Native ms | RiX / JS | JS / Native |
|---|---:|---:|---:|---:|---:|
| modular-powers | 1538.679 | 22.669 | 20.616 | 67.88× | 1.10× |
| async-microtasks | 31.317 | 0.671 | 1.330 | 46.69× | 0.50× |
| async-host-latency | 337.839 | 322.020 | 323.303 | 1.05× | 1.00× |

Selected JavaScript arithmetic algorithm: window-6. Fresh native preparation: 281.62 ms.

Complete measurements, diagnostics, compilation/parse costs, source/input/result digests and host-wait timings are in the matching JSON report.
