# Problem 6: Sum square difference

## The problem

The sum of the squares of the first ten natural numbers is
$1^2 + 2^2 + \dots + 10^2 = 385$. The square of their sum is
$(1 + 2 + \dots + 10)^2 = 55^2 = 3025$. The difference between the two is
$3025 - 385 = 2640$.

Find the difference between the sum of the squares of the first one hundred
natural numbers and the square of their sum.

Source: [Project Euler problem 6](https://projecteuler.net/problem=6).

## Small experiments

Build both quantities for 10 exactly as the statement describes them.

```rix edu
firstTen := .IRANGE(1, 10);
squares := firstTen |>> (k) -> k^2;
squares |>: @+[2] ##@ == 385;
(firstTen |>: @+[2])^2 ##@ == 3025;
3025 - 385 ##@ == 2640;
```

## A direct general solution

```rix edu
SumOfSquares(n) -> .IRANGE(1, n) |>> ((k) -> k^2) |>: @+[2];
SquareOfSum(n) -> (.IRANGE(1, n) |>: @+[2])^2;
Difference(n) -> SquareOfSum(n) - SumOfSquares(n);
Difference(10) ##@ == 2640;
Difference(100);
```

That already answers the question. The rest of this note looks for a formula.

## Finding a closed form

Both sums have classical formulas:

$$\sum_{k=1}^{n} k = \frac{n(n+1)}{2}, \qquad \sum_{k=1}^{n} k^2 = \frac{n(n+1)(2n+1)}{6}.$$

Check them against the direct sums before relying on them.

```rix edu
Triangle(n) -> n * (n + 1) / 2;
Pyramid(n) -> n * (n + 1) * (2n + 1) / 6;
Triangle(10) ##@ == 55;
Pyramid(10) ##@ == 385;
(.IRANGE(1, 50) |>? (n) -> Pyramid(n) != SumOfSquares(n)).Len() ##@ == 0;
```

Subtracting and factoring by hand gives

$$\left(\frac{n(n+1)}{2}\right)^2 - \frac{n(n+1)(2n+1)}{6} = \frac{n(n-1)(n+1)(3n+2)}{12}.$$

Rather than trust the algebra, compare the factored form with the direct
computation over a range of $n$. Rational arithmetic is exact, so the
division by 12 introduces no rounding.

```rix edu
Closed(n) -> n * (n - 1) * (n + 1) * (3n + 2) / 12;
.IRANGE(1, 8) |>> (n) -> {: n, Difference(n), Closed(n) };
(.IRANGE(1, 200) |>? (n) -> Closed(n) != Difference(n)).Len() ##@ == 0;
```

The difference is 0 at $n = 1$, as it must be, and the two agree for every
$n$ up to 200. The closed form also shows how fast the gap grows: like
$n^4/4$.

```rix edu
Closed(10^12);
```

## Answer

```rix edu
answer := Closed(100);
answer ##@ == 25164150;
answer == Difference(100) ##@ == 1;
```

For the first one hundred natural numbers the difference is **@{answer}**.
