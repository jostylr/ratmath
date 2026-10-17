# Combined polynomial operations in fast core — node

7 rounds, 2 warmups. Milliseconds per full point batch; all paths use the same copied fast core.

## integer-horner

Degree 32, 32 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 3.4212 | 1.00× |
| JS Horner, same methods | 0.0352 | 97.22× |
| RiX combined per point | 0.0541 | 63.25× |
| RiX fused per point | 0.0656 | 52.18× |
| RiX combined batch | 0.0357 | 95.94× |
| RiX fused batch | 0.0459 | 74.56× |
| JS fused batch | 0.0456 | 75.08× |

## rational-horner

Degree 16, 16 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 7.0439 | 1.00× |
| JS Horner, same methods | 0.3212 | 21.93× |
| RiX combined per point | 0.3353 | 21.01× |
| RiX fused per point | 0.2979 | 23.64× |
| RiX combined batch | 0.3230 | 21.81× |
| RiX fused batch | 0.2873 | 24.52× |
| JS fused batch | 0.2863 | 24.60× |

## rational-coefficients-horner

Degree 16, 16 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 7.1612 | 1.00× |
| JS Horner, same methods | 0.3654 | 19.60× |
| RiX combined per point | 0.3788 | 18.91× |
| RiX fused per point | 0.3478 | 20.59× |
| RiX combined batch | 0.3699 | 19.36× |
| RiX fused batch | 0.3385 | 21.16× |
| JS fused batch | 0.3356 | 21.34× |

## larger-rational-horner

Degree 32, 8 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 42.4785 | 1.00× |
| JS Horner, same methods | 1.8039 | 23.55× |
| RiX combined per point | 1.8231 | 23.30× |
| RiX fused per point | 1.7757 | 23.92× |
| RiX combined batch | 1.8134 | 23.42× |
| RiX fused batch | 1.7881 | 23.76× |
| JS fused batch | 1.7678 | 24.03× |

## zero-rational-horner

Degree 128, 4 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 1.7089 | 1.00× |
| JS Horner, same methods | 0.0751 | 22.76× |
| RiX combined per point | 0.0837 | 20.42× |
| RiX fused per point | 0.0312 | 54.75× |
| RiX combined batch | 0.0766 | 22.31× |
| RiX fused batch | 0.0263 | 65.08× |
| JS fused batch | 0.0261 | 65.60× |

## interval-horner

Degree 8, 8 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 0.3406 | 1.00× |
| JS Horner, same methods | 0.0641 | 5.31× |
| RiX combined per point | 0.0722 | 4.72× |
| RiX fused per point | 0.0714 | 4.77× |
| RiX combined batch | 0.0653 | 5.21× |
| RiX fused batch | 0.0654 | 5.21× |
| JS fused batch | 0.0645 | 5.28× |

## rational-coefficients-integer-points

Degree 16, 32 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 2.0354 | 1.00× |
| JS Horner, same methods | 0.1830 | 11.12× |
| RiX combined per point | 0.2027 | 10.04× |
| RiX fused per point | 0.1551 | 13.12× |
| RiX combined batch | 0.1840 | 11.06× |
| RiX fused batch | 0.1338 | 15.21× |
| JS fused batch | 0.1345 | 15.13× |

## constant-rational-polynomial

Degree 0, 16 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 0.1113 | 1.00× |
| JS Horner, same methods | 0.0040 | 27.94× |
| RiX combined per point | 0.0137 | 8.11× |
| RiX fused per point | 0.0129 | 8.61× |
| RiX combined batch | 0.0046 | 24.40× |
| RiX fused batch | 0.0035 | 32.07× |
| JS fused batch | 0.0031 | 36.09× |

Combined method paths remove interpreter work inside Horner. Fused paths additionally remove intermediate Integer/Rational wrappers while using the same stepwise reduced multiply/add kernel. Batch paths remove per-point RiX traversal/calls. JS paths expose the remaining host-boundary overhead. There is no changed polynomial algorithm, delayed fraction normalization, leading-zero pruning, compilation, native code or cached preparation.
