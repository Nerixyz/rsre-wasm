/**
 * This class is another wrapper around `RegexWrapper` that's created by `wasm-bindgen`.
 * As `wasm-bindgen` doesn't allow inheritance and/or defining symbols as keys, this wrapper is needed to act like a regular RegExp instance.
 */
export class RsReWasm extends RegExp {
    /**
     * This method frees the memory allocated by wasm. It should be called **only** after the use of this class.
     * If the current Node version is >=14.6 (or 13 with `--harmony-weak-refs`) this job should be done by the `FinalizationRegistry` for you.
     */
    free(): void;
}