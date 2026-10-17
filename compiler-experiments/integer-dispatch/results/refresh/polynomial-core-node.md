# Combined polynomial operations in fast core — node

7 rounds, 2 warmups. Milliseconds per full point batch; all paths use the same copied fast core.

## integer-horner

Degree 32, 32 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 3.3331 | 1.00× |
| JS Horner, same methods | 0.0345 | 96.48× |
| RiX combined per point | 0.0523 | 63.73× |
| RiX fused per point | 0.0626 | 53.21× |
| RiX combined batch | 0.0353 | 94.48× |
| RiX fused batch | 0.0450 | 74.10× |
| JS fused batch | 0.0446 | 74.68× |

## rational-horner

Degree 16, 16 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 7.0392 | 1.00× |
| JS Horner, same methods | 0.3190 | 22.06× |
| RiX combined per point | 0.3316 | 21.23× |
| RiX fused per point | 0.2955 | 23.82× |
| RiX combined batch | 0.3207 | 21.95× |
| RiX fused batch | 0.2850 | 24.70× |
| JS fused batch | 0.2854 | 24.67× |

## rational-coefficients-horner

Degree 16, 16 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 7.2930 | 1.00× |
| JS Horner, same methods | 0.3663 | 19.91× |
| RiX combined per point | 0.3783 | 19.28× |
| RiX fused per point | 0.3480 | 20.96× |
| RiX combined batch | 0.3684 | 19.80× |
| RiX fused batch | 0.3370 | 21.64× |
| JS fused batch | 0.3352 | 21.76× |

## larger-rational-horner

Degree 32, 8 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 42.7099 | 1.00× |
| JS Horner, same methods | 1.8351 | 23.27× |
| RiX combined per point | 1.8228 | 23.43× |
| RiX fused per point | 1.7754 | 24.06× |
| RiX combined batch | 1.8251 | 23.40× |
| RiX fused batch | 1.7672 | 24.17× |
| JS fused batch | 1.7494 | 24.41× |

## zero-rational-horner

Degree 128, 4 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 1.6588 | 1.00× |
| JS Horner, same methods | 0.0768 | 21.59× |
| RiX combined per point | 0.0805 | 20.60× |
| RiX fused per point | 0.0303 | 54.78× |
| RiX combined batch | 0.0769 | 21.56× |
| RiX fused batch | 0.0255 | 65.14× |
| JS fused batch | 0.0254 | 65.33× |

## interval-horner

Degree 8, 8 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 0.3496 | 1.00× |
| JS Horner, same methods | 0.0649 | 5.38× |
| RiX combined per point | 0.0728 | 4.80× |
| RiX fused per point | 0.0728 | 4.80× |
| RiX combined batch | 0.0660 | 5.29× |
| RiX fused batch | 0.0658 | 5.31× |
| JS fused batch | 0.0653 | 5.35× |

## rational-coefficients-integer-points

Degree 16, 32 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 1.9855 | 1.00× |
| JS Horner, same methods | 0.1877 | 10.58× |
| RiX combined per point | 0.2067 | 9.60× |
| RiX fused per point | 0.1548 | 12.83× |
| RiX combined batch | 0.1884 | 10.54× |
| RiX fused batch | 0.1376 | 14.43× |
| JS fused batch | 0.1358 | 14.62× |

## constant-rational-polynomial

Degree 0, 16 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 0.1148 | 1.00× |
| JS Horner, same methods | 0.0042 | 27.58× |
| RiX combined per point | 0.0143 | 8.03× |
| RiX fused per point | 0.0133 | 8.62× |
| RiX combined batch | 0.0047 | 24.40× |
| RiX fused batch | 0.0034 | 33.70× |
| JS fused batch | 0.0031 | 37.39× |

Combined method paths remove interpreter work inside Horner. Fused paths additionally remove intermediate Integer/Rational wrappers while using the same stepwise reduced multiply/add kernel. Batch paths remove per-point RiX traversal/calls. JS paths expose the remaining host-boundary overhead. There is no changed polynomial algorithm, delayed fraction normalization, leading-zero pruning, compilation, native code or cached preparation.
