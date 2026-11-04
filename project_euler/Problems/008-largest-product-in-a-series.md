# Problem 8: Largest product in a series

## The problem

In the 1000-digit number below, the four adjacent digits with the greatest
product are $9 \times 9 \times 8 \times 9 = 5832$. Find the thirteen adjacent
digits with the greatest product. What is the value of that product?

Source: [Project Euler problem 8](https://projecteuler.net/problem=8).

## The data

The number is entered as twenty strings of fifty digits, joined with the
concatenation operator `++`. Keeping it as text avoids any question of how
to write a 1000-digit literal.

```rix edu
series := "73167176531330624919225119674426574742355349194934"
    ++ "96983520312774506326239578318016984801869478851843"
    ++ "85861560789112949495459501737958331952853208805511"
    ++ "12540698747158523863050715693290963295227443043557"
    ++ "66896648950445244523161731856403098711121722383113"
    ++ "62229893423380308135336276614282806444486645238749"
    ++ "30358907296290491560440772390713810515859307960866"
    ++ "70172427121883998797908792274921901699720888093776"
    ++ "65727333001053367881220235421809751254540594752243"
    ++ "52584907711670556013604839586446706324415722155397"
    ++ "53697817977846174064955149290862569321978468622482"
    ++ "83972241375657056057490261407972968652414535100474"
    ++ "82166370484403199890008895243450658541227588666881"
    ++ "16427171479924442928230863465674813919123162824586"
    ++ "17866458359124566529476545682848912883142607690042"
    ++ "24219022671055626321111109370544217506941658960408"
    ++ "07198403850962455444362981230987879927244284909188"
    ++ "84580156166097919133875499200524063689912560717606"
    ++ "05886116467109405077541002256983155200055935729725"
    ++ "71636269561882670428252483600823257530420752963450";
```

```rix edu
series.Len() ##@ == 1000;
series.Slice(1, 21);
```

## Small experiments

Arithmetic needs numbers, not characters. `ch <_ 10` parses a digit string
in base 10, and a string `Reduce` visits the characters in order, so pushing
each parsed digit onto a list converts the whole series.

```rix edu
"9989" <_ 10;
Digits(text) -> text.Reduce((list, ch) -> list.Push!(ch <_ 10), []);
Digits("9989");
digits := Digits(series);
digits.Len() ##@ == 1000;
digits[1:10];
```

Bracket slices are inclusive at both ends, so the first window of four is
`digits[1:4]`, and a reduce with `@*` multiplies it out.

```rix edu
digits[1:4];
digits[1:4] |>: @*[2];
digits[2:5] |>: @*[2];
```

$7 \times 3 \times 1 \times 6 = 126$. Sliding the window one place at a time
gives every candidate.

## General solution

`WindowProduct` is the product of the `width` digits starting at position
`i`. There are `length - width + 1` starting positions, and the answer is the
largest product among them.

```rix edu
WindowProduct(ds, i, width) -> ds[i:(i + width - 1)] |>: @*[2];
WindowProducts(ds, width) -> .IRANGE(1, ds.Len() - width + 1) |>> (i) -> WindowProduct(ds, i, width);
LargestProduct(ds, width) -> WindowProducts(ds, width) |>: @_MAX[2];
LargestProduct(Digits("9989"), 4) ##@ == 5832;
LargestProduct(digits, 4) ##@ == 5832;
```

The four-digit result matches the statement, which also confirms the series
was entered correctly around its best window. Width 1 should find the
largest single digit, and the full width should be the product of all the
digits, which is 0 because the series contains zeros.

```rix edu
LargestProduct(digits, 1) ##@ == 9;
LargestProduct(digits, 1000) ##@ == 0;
```

Where is the best window? Filter the starting positions for the ones that
attain the maximum.

```rix edu
BestStarts(ds, width) -> {;
    products := WindowProducts(ds, width);
    best := products |>: @_MAX[2];
    .IRANGE(1, products.Len()) |>? (i) -> products[i] == best
};
BestStarts(digits, 4);
start := BestStarts(digits, 13)[1];
digits[start:(start + 12)];
```

A window containing a 0 has product 0, so the best thirteen digits sit
between zeros and are mostly large.

## Answer

```rix edu
answer := LargestProduct(digits, 13);
answer ##@ == 23514624000;
```

The greatest product of thirteen adjacent digits is **@{answer}**.
