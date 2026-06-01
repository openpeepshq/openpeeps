/**
 * Polyfill `CustomEvent` for React Native. RN 0.85 exposes `CustomEvent` as
 * a private module under `react-native/src/private/webapis/dom/events`, but
 * does not install it on `globalThis`. Libraries such as `sse.js` reach for
 * `new CustomEvent(...)` directly and throw `ReferenceError` without it,
 * which silently breaks every SSE subscription (no XHR is opened).
 *
 * The shim below is intentionally minimal — `sse.js` only needs a constructor
 * that yields an object with a writable `type` field; it then mutates extra
 * properties (`readyState`, `responseCode`, etc.) onto the instance.
 */
declare const globalThis: {CustomEvent?: unknown} & typeof global;

type CustomEventOptions = {detail?: unknown};

if (typeof globalThis.CustomEvent !== 'function') {
  class CustomEventPolyfill {
    type: string;
    detail: unknown;
    defaultPrevented: boolean;

    constructor(type: string, params: CustomEventOptions = {}) {
      this.type = type;
      this.detail = params.detail ?? null;
      this.defaultPrevented = false;
    }

    preventDefault() {
      this.defaultPrevented = true;
    }

    stopPropagation() {}
    stopImmediatePropagation() {}
  }

  // @ts-expect-error — assigning to a read-only DOM global is intentional.
  globalThis.CustomEvent = CustomEventPolyfill;
}

export {};
