# Interpreter overhead — bun

Times are milliseconds per full point batch. Same fast core; original RiX source unless labeled otherwise.

## integer-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 2.8703 | 1.00× |
| copy | 2.8161 | 1.02× |
| literals | 2.6589 | 1.08× |
| literals + RiX hoisted Len | 2.2172 | 1.29× |
| JS Horner, same core methods | 0.0312 | 92.13× |

## rational-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 2.8863 | 1.00× |
| copy | 1.0916 | 2.64× |
| literals | 0.9976 | 2.89× |
| literals + RiX hoisted Len | 0.9093 | 3.17× |
| JS Horner, same core methods | 0.2301 | 12.55× |

## rational-coefficients-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 3.0091 | 1.00× |
| copy | 1.1740 | 2.56× |
| literals | 1.0573 | 2.85× |
| literals + RiX hoisted Len | 0.9668 | 3.11× |
| JS Horner, same core methods | 0.2760 | 10.90× |

## larger-rational-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 14.5425 | 1.00× |
| copy | 1.5791 | 9.21× |
| literals | 1.4915 | 9.75× |
| literals + RiX hoisted Len | 1.3613 | 10.68× |
| JS Horner, same core methods | 0.6983 | 20.83× |

## zero-rational-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 1.5332 | 1.00× |
| copy | 1.5276 | 1.00× |
| literals | 1.3825 | 1.11× |
| literals + RiX hoisted Len | 1.2025 | 1.28× |
| JS Horner, same core methods | 0.0637 | 24.09× |

## interval-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 0.3362 | 1.00× |
| copy | 0.3428 | 0.98× |
| literals | 0.3186 | 1.06× |
| literals + RiX hoisted Len | 0.2816 | 1.19× |
| JS Horner, same core methods | 0.0707 | 4.76× |

## rational-coefficients-integer-points

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 1.6228 | 1.00× |
| copy | 1.7004 | 0.95× |
| literals | 1.5313 | 1.06× |
| literals + RiX hoisted Len | 1.3957 | 1.16× |
| JS Horner, same core methods | 0.1627 | 9.97× |

## constant-rational-polynomial

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 0.0887 | 1.00× |
| copy | 0.0941 | 0.94× |
| literals | 0.0791 | 1.12× |
| literals + RiX hoisted Len | 0.0780 | 1.14× |
| JS Horner, same core methods | 0.0025 | 36.01× |
