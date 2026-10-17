# Direct BigInt compilation — node

24 powers; 2048-bit modulus; 1024-bit exponent. 9 rounds, 3 warmups.

| Path | Median ms | Min–max ms | Speedup vs RiX | Relative to tuned JS |
|---|---:|---:|---:|---:|
| interpreted RiX | 4806.735 | 4710.193–4863.121 | 1.00× | 119.92× time |
| compiled BigInt | 98.320 | 96.823–106.908 | 48.89× | 2.45× time |
| compiled BigInt + peepholes | 95.492 | 93.517–101.465 | 50.34× | 2.38× time |
| handwritten binary | 95.639 | 93.080–98.124 | 50.26× | 2.39× time |
| hand-tuned montgomery-5 | 40.084 | 39.788–40.786 | 119.92× | 1.00× time |
| compiled raw diagnostic | 94.996 | 93.527–97.883 | 50.60× | 2.37× time |

Compilation including parsing: 0.993 / 0.374 ms (plain / peepholes). Module import: 0.326 / 0.137 ms.

Input conversion, guards, output boxing and whole-batch computation are timed. Every warmup, tuning run and timed result is checked outside its timing. Raw diagnostic omits boundary conversion/boxing. See README for scope and caveats.
