#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <gmp.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <time.h>

#define MATRIX 1
#define MAP 0
static uint64_t clock_ns(void) {
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return (uint64_t)t.tv_sec * 1000000000ULL + (uint64_t)t.tv_nsec;
}
static void fail(const char *message) { fprintf(stderr, "%s\n", message); exit(2); }
static char *line = NULL;
static size_t line_capacity = 0;
static void read_line(void) {
    ssize_t size = getline(&line, &line_capacity, stdin);
    if (size < 1 || size > 10000 || line[size - 1] != '\n') fail("Invalid/truncated input line");
    line[size - 1] = 0;
}
static void read_fraction(mpq_t value) {
    read_line();
    if (mpq_set_str(value, line, 10) != 0 || mpz_sgn(mpq_denref(value)) == 0) fail("Invalid fraction");
    mpq_canonicalize(value);
}
static mpq_t *allocate_values(size_t count) {
    mpq_t *values = calloc(count, sizeof(mpq_t));
    if (!values) fail("Allocation failed");
    for (size_t i = 0; i < count; i++) mpq_init(values[i]);
    return values;
}
static void free_values(mpq_t *values, size_t count) {
    for (size_t i = 0; i < count; i++) mpq_clear(values[i]);
    free(values);
}
int main(void) {
    uint64_t parse_start = clock_ns();
    read_line();
    if (strcmp(line, "RIXNATIVE1") != 0) fail("Unsupported protocol");
    read_line();
    unsigned rows, inner, cols;
    char extra;
    if (sscanf(line, "%u %u %u %c", &rows, &inner, &cols, &extra) != 3) fail("Invalid dimensions");
    size_t left_count, right_count, result_count;
    if (MATRIX) {
        if (!rows || !inner || !cols || rows > 512 || inner > 512 || cols > 512 ||
            (uint64_t)rows * inner * cols > 50000000ULL) fail("Matrix exceeds job budget");
        left_count = (size_t)rows * inner; right_count = (size_t)inner * cols; result_count = (size_t)rows * cols;
    } else {
        if (!rows || rows > 2000000 || inner != 1 || cols != 1) fail("Pair job exceeds budget");
        left_count = right_count = rows; result_count = MAP ? rows : 1;
    }
    mpq_t *left = allocate_values(left_count), *right = allocate_values(right_count), *outputs = allocate_values(result_count);
    for (size_t i = 0; i < left_count; i++) read_fraction(left[i]);
    for (size_t i = 0; i < right_count; i++) read_fraction(right[i]);
    if (fgetc(stdin) != EOF) fail("Unexpected trailing input");
    mpq_t t0; mpq_init(t0);
    uint64_t compute_start = clock_ns();
    if (MATRIX) {
        for (unsigned i = 0; i < rows; i++) {
            for (unsigned j = 0; j < cols; j++) {
                mpq_ptr acc = outputs[(size_t)i * cols + j];
                for (unsigned k = 0; k < inner; k++) {
                    mpq_srcptr x = left[(size_t)i * inner + k];
                    mpq_srcptr y = right[(size_t)k * cols + j];
                    (void)x; (void)y;
                    mpq_mul(t0, x, y);
mpq_add(acc, acc, t0);
                }
            }
        }
    } else {
        for (size_t i = 0; i < left_count; i++) {
            mpq_ptr acc = outputs[MAP ? i : 0];
            mpq_srcptr x = left[i], y = right[i];
            (void)x; (void)y;
            mpq_mul(t0, x, y);
mpq_add(acc, acc, t0);
        }
    }
    uint64_t format_start = clock_ns();
    char *payload = NULL;
    size_t payload_size = 0;
    FILE *stream = open_memstream(&payload, &payload_size);
    if (!stream) fail("Output allocation failed");
    for (size_t i = 0; i < result_count; i++) {
        mpq_out_str(stream, 10, outputs[i]); fputc('\n', stream);
    }
    if (fclose(stream) != 0) fail("Formatting failed");
    uint64_t format_end = clock_ns();
    printf("RIXRESULT1 %zu %llu %llu %llu\n", result_count,
           (unsigned long long)(compute_start - parse_start),
           (unsigned long long)(format_start - compute_start),
           (unsigned long long)(format_end - format_start));
    if (fwrite(payload, 1, payload_size, stdout) != payload_size) fail("Writing result failed");
    free(payload); free(line);
    mpq_clear(t0);
    free_values(left, left_count); free_values(right, right_count); free_values(outputs, result_count);
    return 0;
}
