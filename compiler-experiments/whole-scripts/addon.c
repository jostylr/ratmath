#define NAPI_VERSION 8
#include <node_api.h>
#include <gmp.h>
#include <stdint.h>
#include <stdlib.h>
#include <stdbool.h>

static napi_value error(napi_env env, const char *message) {
    bool pending = false;
    napi_is_exception_pending(env, &pending);
    if (!pending) napi_throw_error(env, NULL, message);
    return NULL;
}

static bool import_bigint(napi_env env, napi_value value, mpz_t output) {
    size_t count = 0;
    if (napi_get_value_bigint_words(env, value, NULL, &count, NULL) != napi_ok || count > 128) {
        error(env, "Bounded BigInt required (maximum 8192 bits)"); return false;
    }
    if (count == 0) { mpz_set_ui(output, 0); return true; }
    uint64_t *words = calloc(count, sizeof(uint64_t));
    if (!words) { error(env, "Allocation failed"); return false; }
    int sign = 0;
    napi_status status = napi_get_value_bigint_words(env, value, &sign, &count, words);
    if (status == napi_ok) {
        mpz_import(output, count, -1, sizeof(uint64_t), 0, 0, words);
        if (sign) mpz_neg(output, output);
    }
    free(words);
    if (status != napi_ok) { error(env, "BigInt conversion failed"); return false; }
    return true;
}

static napi_value export_bigint(napi_env env, const mpz_t value) {
    napi_value result;
    if (mpz_sgn(value) == 0) {
        if (napi_create_bigint_uint64(env, 0, &result) != napi_ok) return error(env, "BigInt creation failed");
        return result;
    }
    size_t capacity = (mpz_sizeinbase(value, 2) + 63) / 64, count = 0;
    uint64_t *words = calloc(capacity, sizeof(uint64_t));
    if (!words) return error(env, "Allocation failed");
    mpz_export(words, &count, -1, sizeof(uint64_t), 0, 0, value);
    napi_status status = napi_create_bigint_words(env, mpz_sgn(value) < 0, count, words, &result);
    free(words);
    return status == napi_ok ? result : error(env, "BigInt creation failed");
}

static void binary_power(mpz_t result, const mpz_t base, const mpz_t exponent, const mpz_t modulus) {
    mpz_t b, e;
    mpz_inits(b, e, NULL);
    mpz_mod(b, base, modulus); mpz_set(e, exponent);
    mpz_set_ui(result, 1); mpz_mod(result, result, modulus);
    while (mpz_sgn(e) > 0) {
        if (mpz_odd_p(e)) { mpz_mul(result, result, b); mpz_mod(result, result, modulus); }
        mpz_mul(b, b, b); mpz_mod(b, b, modulus);
        mpz_fdiv_q_2exp(e, e, 1);
    }
    mpz_clears(b, e, NULL);
}

static napi_value powers(napi_env env, napi_callback_info info, bool binary) {
    size_t argc = 3;
    napi_value args[3], outputs = NULL;
    bool array = false;
    uint32_t count = 0;
    if (napi_get_cb_info(env, info, &argc, args, NULL, NULL) != napi_ok || argc != 3 ||
        napi_is_array(env, args[0], &array) != napi_ok || !array ||
        napi_get_array_length(env, args[0], &count) != napi_ok || !count || count > 4096) return error(env, "Nonempty array of at most 4096 BigInt bases required");
    mpz_t base, exponent, modulus, result;
    mpz_inits(base, exponent, modulus, result, NULL);
    if (!import_bigint(env, args[1], exponent) || !import_bigint(env, args[2], modulus)) goto done;
    if (mpz_sgn(exponent) < 0 || mpz_sizeinbase(exponent, 2) > 4096 || mpz_sgn(modulus) <= 0) { error(env, "Nonnegative exponent <= 4096 bits and positive modulus required"); goto done; }
    if (napi_create_array_with_length(env, count, &outputs) != napi_ok) { error(env, "Array creation failed"); goto done; }
    for (uint32_t i = 0; i < count; i++) {
        napi_value input;
        if (napi_get_element(env, args[0], i, &input) != napi_ok || !import_bigint(env, input, base)) { outputs = NULL; goto done; }
        if (mpz_sgn(base) < 0) { outputs = error(env, "Nonnegative base required"); goto done; }
        if (binary) binary_power(result, base, exponent, modulus);
        else mpz_powm(result, base, exponent, modulus);
        napi_value output = export_bigint(env, result);
        if (!output || napi_set_element(env, outputs, i, output) != napi_ok) { outputs = error(env, "Result conversion failed"); goto done; }
    }
done:
    mpz_clears(base, exponent, modulus, result, NULL);
    return outputs;
}
static napi_value power_batch(napi_env env, napi_callback_info info) { return powers(env, info, false); }
static napi_value binary_batch(napi_env env, napi_callback_info info) { return powers(env, info, true); }

static bool uint32_input(napi_env env, napi_value input, uint64_t *value) {
    bool lossless = false;
    if (napi_get_value_bigint_uint64(env, input, value, &lossless) != napi_ok || !lossless || *value > UINT32_MAX) {
        error(env, "Unsigned 32-bit BigInt inputs required"); return false;
    }
    return true;
}
static uint64_t score_value(uint64_t value, uint64_t bias) { return (value * 1664525ULL + bias) % 1000003ULL; }
static napi_value score(napi_env env, napi_callback_info info) {
    size_t argc = 2; napi_value args[2], result; uint64_t value, bias;
    if (napi_get_cb_info(env, info, &argc, args, NULL, NULL) != napi_ok || argc != 2 ||
        !uint32_input(env, args[0], &value) || !uint32_input(env, args[1], &bias)) return error(env, "Unsigned 32-bit BigInt inputs required");
    return napi_create_bigint_uint64(env, score_value(value, bias), &result) == napi_ok ? result : error(env, "Score creation failed");
}

// Handwritten native async state machine. JavaScript owns the host capabilities;
// C owns the job index, captured bias, promise continuations and result array.
typedef struct {
    napi_env env;
    napi_deferred deferred;
    napi_ref ids, fetch, publish, integer_constructor, outputs;
    uint32_t index, count;
    uint64_t bias;
} workflow;

static void cleanup(workflow *state) {
    napi_ref refs[] = {state->ids, state->fetch, state->publish, state->integer_constructor, state->outputs};
    for (size_t i = 0; i < 5; i++) if (refs[i]) napi_delete_reference(state->env, refs[i]);
    free(state);
}
static void reject(workflow *state, napi_value reason, const char *message) {
    napi_env env = state->env;
    bool pending = false; napi_is_exception_pending(env, &pending);
    if (pending) napi_get_and_clear_last_exception(env, &reason);
    if (!reason) {
        napi_value text;
        napi_create_string_utf8(env, message, NAPI_AUTO_LENGTH, &text);
        napi_create_error(env, NULL, text, &reason);
    }
    napi_reject_deferred(env, state->deferred, reason);
    cleanup(state);
}
static void next_job(workflow *state);

static napi_value fetch_failed(napi_env env, napi_callback_info info) {
    size_t argc = 1; napi_value args[1], undefined; void *data;
    napi_get_cb_info(env, info, &argc, args, NULL, &data);
    reject((workflow *)data, argc ? args[0] : NULL, "Host fetch failed");
    napi_get_undefined(env, &undefined); return undefined;
}
static napi_value fetch_ready(napi_env env, napi_callback_info info) {
    size_t argc = 1; napi_value args[1], undefined; void *data;
    napi_get_cb_info(env, info, &argc, args, NULL, &data);
    workflow *state = data;
    napi_value raw, scalar, constructor, result, outputs, ids, id, publish, ignored;
    uint64_t value;
    if (argc != 1 || napi_get_named_property(env, args[0], "value", &raw) != napi_ok || !uint32_input(env, raw, &value) ||
        napi_create_bigint_uint64(env, score_value(value, state->bias), &scalar) != napi_ok ||
        napi_get_reference_value(env, state->integer_constructor, &constructor) != napi_ok ||
        napi_new_instance(env, constructor, 1, &scalar, &result) != napi_ok ||
        napi_get_reference_value(env, state->outputs, &outputs) != napi_ok ||
        napi_set_element(env, outputs, state->index, result) != napi_ok ||
        napi_get_reference_value(env, state->ids, &ids) != napi_ok ||
        napi_get_element(env, ids, state->index, &id) != napi_ok ||
        napi_get_reference_value(env, state->publish, &publish) != napi_ok ||
        napi_call_function(env, ids, publish, 2, (napi_value[]){id, result}, &ignored) != napi_ok) {
        reject(state, NULL, "Native workflow processing failed");
    } else if (++state->index == state->count) {
        napi_resolve_deferred(env, state->deferred, outputs);
        cleanup(state);
    } else next_job(state);
    napi_get_undefined(env, &undefined); return undefined;
}
static void next_job(workflow *state) {
    napi_env env = state->env;
    napi_value ids, id, fetch, promise, then, callbacks[2], ignored;
    bool is_promise = false;
    if (napi_get_reference_value(env, state->ids, &ids) != napi_ok ||
        napi_get_element(env, ids, state->index, &id) != napi_ok ||
        napi_get_reference_value(env, state->fetch, &fetch) != napi_ok ||
        napi_call_function(env, ids, fetch, 1, &id, &promise) != napi_ok ||
        napi_is_promise(env, promise, &is_promise) != napi_ok || !is_promise ||
        napi_get_named_property(env, promise, "then", &then) != napi_ok ||
        napi_create_function(env, "fetchReady", NAPI_AUTO_LENGTH, fetch_ready, state, &callbacks[0]) != napi_ok ||
        napi_create_function(env, "fetchFailed", NAPI_AUTO_LENGTH, fetch_failed, state, &callbacks[1]) != napi_ok ||
        napi_call_function(env, promise, then, 2, callbacks, &ignored) != napi_ok) {
        reject(state, NULL, "Host fetch must return a Promise");
    }
}
static napi_value run_workflow(napi_env env, napi_callback_info info) {
    size_t argc = 5; napi_value args[5], promise, outputs; bool array = false;
    uint32_t count = 0; uint64_t bias;
    if (napi_get_cb_info(env, info, &argc, args, NULL, NULL) != napi_ok || argc != 5 ||
        napi_is_array(env, args[0], &array) != napi_ok || !array ||
        napi_get_array_length(env, args[0], &count) != napi_ok || !count || count > 16384 ||
        !uint32_input(env, args[1], &bias)) return error(env, "Native workflow requires jobs, uint32 bias, fetch, publish and Integer constructor");
    for (size_t i = 2; i < 5; i++) {
        napi_valuetype type;
        if (napi_typeof(env, args[i], &type) != napi_ok || type != napi_function) return error(env, "Workflow callbacks/constructor must be functions");
    }
    workflow *state = calloc(1, sizeof(workflow));
    if (!state) return error(env, "Allocation failed");
    state->env = env; state->count = count; state->bias = bias;
    if (napi_create_promise(env, &state->deferred, &promise) != napi_ok ||
        napi_create_array_with_length(env, count, &outputs) != napi_ok ||
        napi_create_reference(env, args[0], 1, &state->ids) != napi_ok ||
        napi_create_reference(env, args[2], 1, &state->fetch) != napi_ok ||
        napi_create_reference(env, args[3], 1, &state->publish) != napi_ok ||
        napi_create_reference(env, args[4], 1, &state->integer_constructor) != napi_ok ||
        napi_create_reference(env, outputs, 1, &state->outputs) != napi_ok) {
        cleanup(state); return error(env, "Workflow setup failed");
    }
    next_job(state);
    return promise;
}

static napi_value initialize(napi_env env, napi_value exports) {
    napi_property_descriptor descriptors[] = {
        {"powerBatch", NULL, power_batch, NULL, NULL, NULL, napi_default, NULL},
        {"binaryBatch", NULL, binary_batch, NULL, NULL, NULL, napi_default, NULL},
        {"score", NULL, score, NULL, NULL, NULL, napi_default, NULL},
        {"runWorkflow", NULL, run_workflow, NULL, NULL, NULL, napi_default, NULL},
    };
    if (napi_define_properties(env, exports, 4, descriptors) != napi_ok) return error(env, "Native exports failed");
    return exports;
}
NAPI_MODULE(whole_scripts, initialize)
