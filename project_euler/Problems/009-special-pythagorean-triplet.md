# Problem 9: Special Pythagorean triplet

## The problem

A Pythagorean triplet is a set of three natural numbers $a < b < c$ with
$a^2 + b^2 = c^2$. For example $3^2 + 4^2 = 9 + 16 = 25 = 5^2$.

There exists exactly one Pythagorean triplet for which $a + b + c = 1000$.
Find the product $abc$.

Source: [Project Euler problem 9](https://projecteuler.net/problem=9).

## Small experiments

The example triplet has perimeter 12. For a small perimeter we can try every
$a$ and $b$ and let $c$ be whatever is left.

```rix edu
IsTriplet(a, b, c) -> a < b && b < c && a^2 + b^2 == c^2;
IsTriplet(3, 4, 5) ##@ == 1;
RowFor(a, s) -> .IRANGE(a + 1, s - a - 1) |>? ((b) -> IsTriplet(a, b, s - a - b)) |>> (b) -> {: a, b, s - a - b };
RowFor(3, 12);
RowFor(2, 12);
```

Only $a = 3$ yields anything for perimeter 12. Doing this for every $a$ up
to 1000 would test about half a million pairs. Algebra removes the inner
search.

## Solving for b

Substitute $c = s - a - b$ into $a^2 + b^2 = c^2$, where $s$ is the
perimeter:

$$a^2 + b^2 = (s - a - b)^2 \quad\Longrightarrow\quad b = \frac{s\,(s - 2a)}{2\,(s - a)}.$$

So each $a$ determines $b$ outright. It will usually be a fraction; a
triplet exists exactly when it is a whole number. RiX computes with exact
rationals, so this test is literal: evaluate the formula and ask whether the
result is an integer.

```rix edu
SideB(a, s) -> s * (s - 2a) / (2 * (s - a));
.IRANGE(1, 5) |>> (a) -> {: a, SideB(a, 12) };
```

For perimeter 12, $a = 3$ gives the whole number 4, and $a = 4$ gives 3,
which is the same triangle with the two short sides swapped; requiring
$a < b$ keeps just one of them. The others are mixed numbers such as
$4\tfrac{4}{5}$, written `4..4/5`. The membership test
`? :Integer` separates the two cases.

```rix edu
SideB(3, 12) ? :Integer;
SideB(2, 12) ? :Integer;
```

## General solution

Since $a$ is the smallest of three numbers adding to $s$, it is below $s/3$.
Keep each $a$ whose $b$ is a whole number larger than $a$, then build the
triplet.

```rix edu
Triplet(a, s) -> {; b := SideB(a, s); {: a, b, s - a - b } };
Triplets(s) -> .IRANGE(1, s // 3) |>? ((a) -> SideB(a, s) ? :Integer && a < SideB(a, s)) |>> (a) -> Triplet(a, s);
Triplets(12);
Triplets(30);
Triplets(840);
```

Perimeter 12 gives $(3, 4, 5)$ and 30 gives $(5, 12, 13)$. Perimeter 840 is
famous for having eight triplets, and all eight appear. Every reported
triplet can be checked against the definition, and against the slow search:

```rix edu
(Triplets(840) |>? (t) -> !IsTriplet(t[1], t[2], t[3])).Len() ##@ == 0;
Triplets(840).Len() ##@ == 8;
SlowCount(s) -> .IRANGE(1, s // 3) |>> ((a) -> RowFor(a, s).Len()) |>: @+[2];
(.IRANGE(12, 90) |>? (s) -> SlowCount(s) != Triplets(s).Len()).Len() ##@ == 0;
```

The formula and the brute-force search find the same number of triplets for
every perimeter from 12 to 90.

## Answer

```rix edu
found := Triplets(1000);
found.Len() ##@ == 1;
triplet := found[1];
triplet[1] + triplet[2] + triplet[3] ##@ == 1000;
answer := triplet[1] * triplet[2] * triplet[3];
answer ##@ == 31875000;
```

The only triplet with perimeter 1000 is $(200, 375, 425)$, and its product
is **@{answer}**.
