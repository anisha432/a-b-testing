/**
 * Null/undefined-safe string operations.
 *
 * Every public API mirrors the native String method but gracefully
 * returns a fallback instead of throwing when the input is not a
 * string.  This eliminates the entire class of
 * "undefined is not an object (evaluating 'str.length')" runtime
 * errors that can come from minified recharts / React internals when
 * a nullable value slips through to a `.toLowerCase()` / `.trim()`
 * call.
 */

/** Return the string itself, or `fallback` when the value is not a string. */
export function toStr(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

/** Safe `.toLowerCase()` — returns `""` for non-string inputs. */
export function toLowerCase(val: unknown): string {
  return typeof val === "string" ? val.toLowerCase() : "";
}

/** Safe `.trim()` — returns `""` for non-string inputs. */
export function trim(val: unknown): string {
  return typeof val === "string" ? val.trim() : "";
}

/** Safe `.length` — returns `0` for non-string / non-array inputs. */
export function length(val: unknown): number {
  return typeof val === "string" || Array.isArray(val) ? val.length : 0;
}

/** Safe `.charAt(0)` — returns `""` for non-string inputs. */
export function charAt0(val: unknown): string {
  return typeof val === "string" && val.length > 0 ? val.charAt(0) : "";
}

/** Safe `.slice(1)` — returns `""` for non-string inputs. */
export function slice1(val: unknown): string {
  return typeof val === "string" ? val.slice(1) : "";
}

/** Capitalize the first letter of a string, safely. */
export function capitalize(val: unknown): string {
  const s = toStr(val);
  return s.length > 0 ? charAt0(s).toUpperCase() + slice1(s) : "";
}

/** Return a safe numeric value, defaulting to `fallback`. */
export function toNum(val: unknown, fallback = 0): number {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}
