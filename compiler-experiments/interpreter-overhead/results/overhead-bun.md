# Interpreter overhead — bun

Times are milliseconds per full point batch. Same fast core; original RiX source unless labeled otherwise.

## integer-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 2.7746 | 1.00× |
| copy | 2.7118 | 1.02× |
| literals | 2.5365 | 1.09× |
| literals + RiX hoisted Len | 2.1921 | 1.27× |
| JS Horner, same core methods | 0.0305 | 91.01× |

## rational-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 2.8986 | 1.00× |
| copy | 1.0732 | 2.70× |
| literals | 1.0159 | 2.85× |
| literals + RiX hoisted Len | 0.9298 | 3.12× |
| JS Horner, same core methods | 0.2269 | 12.77× |

## rational-coefficients-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 2.9320 | 1.00× |
| copy | 1.1247 | 2.61× |
| literals | 1.0586 | 2.77× |
| literals + RiX hoisted Len | 0.9403 | 3.12× |
| JS Horner, same core methods | 0.2693 | 10.89× |

## larger-rational-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 13.5867 | 1.00× |
| copy | 1.4937 | 9.10× |
| literals | 1.3902 | 9.77× |
| literals + RiX hoisted Len | 1.2971 | 10.47× |
| JS Horner, same core methods | 0.6588 | 20.62× |

## zero-rational-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 1.4318 | 1.00× |
| copy | 1.4507 | 0.99× |
| literals | 1.3379 | 1.07× |
| literals + RiX hoisted Len | 1.1570 | 1.24× |
| JS Horner, same core methods | 0.0661 | 21.67× |

## interval-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 0.3200 | 1.00× |
| copy | 0.3202 | 1.00× |
| literals | 0.3053 | 1.05× |
| literals + RiX hoisted Len | 0.2754 | 1.16× |
| JS Horner, same core methods | 0.0731 | 4.38× |

## rational-coefficients-integer-points

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 1.8800 | 1.00× |
| copy | 1.9165 | 0.98× |
| literals | 1.7884 | 1.05× |
| literals + RiX hoisted Len | 1.5569 | 1.21× |
| JS Horner, same core methods | 0.1817 | 10.35× |

## constant-rational-polynomial

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 0.0986 | 1.00× |
| copy | 0.1011 | 0.98× |
| literals | 0.0879 | 1.12× |
| literals + RiX hoisted Len | 0.0850 | 1.16× |
| JS Horner, same core methods | 0.0027 | 37.03× |
