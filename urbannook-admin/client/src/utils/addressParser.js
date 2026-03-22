/**
 * Client-Side Address Parser Utilities
 *
 * Mirrors the server-side logic in server/utils/addressParser.js but adds:
 *   • sanitizeAddressLine()   — strips forbidden characters for front-end input control
 *   • buildRawAddress()       — reconstructs a single formatted string from discrete fields
 *   • parseRawAddress()       — smart parse from a free-form string into structured fields
 *
 * All regex patterns and constants are imported from addressConstants.js.
 * To change what characters are allowed or how PIN detection works,
 * edit that file — these functions will pick up the changes automatically.
 */

import {
  PINCODE_REGEX,
  ADDR_FORBIDDEN_CHARS_REGEX,
} from "../constant/addressConstants";

// ─────────────────────────────────────────────────────────────────────────────
// SANITIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strips every character from an address line that is NOT in the allowed set.
 *
 * Allowed: a-z A-Z 0-9 space . , - / #
 * Everything else (@ ! & * etc.) is silently removed in-place.
 *
 * Called on:
 *   • every keystroke in Line 1 / Line 2 inputs          (inline, immediate)
 *   • parsed segments going into Line 1 / Line 2         (during text→form sync)
 *
 * @param   {string} str  Raw user input
 * @returns {string}      Sanitized string (same length or shorter, never crashes)
 */
export function sanitizeAddressLine(str) {
  if (!str || typeof str !== "string") return "";
  return str.replace(ADDR_FORBIDDEN_CHARS_REGEX, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD RAW FROM DISCRETE FIELDS  (Form → Text direction)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Joins the discrete address fields into a single, comma-separated string.
 *
 * Output format: "<line1>, <line2>, <city>, <state>, <pincode>"
 * Empty fields are filtered out so we never produce dangling commas.
 *
 * This is the reverse of parseRawAddress — the two functions are designed to
 * round-trip cleanly:  buildRawAddress(parseRawAddress(s)) ≈ normalise(s)
 *
 * @param   {{ line1, line2, pincode, city, state }} fields
 * @returns {string}  Single formatted address line
 */
export function buildRawAddress({ line1 = "", line2 = "", pincode = "", city = "", state = "" }) {
  return [line1, line2, city, state, pincode]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSE RAW → DISCRETE FIELDS  (Text → Form direction)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Intelligently parses a free-form address string (e.g. pasted from WhatsApp)
 * into structured address fields.
 *
 * Algorithm:
 *  1.  Extract 6-digit PIN using PINCODE_REGEX.
 *  2.  Strip the PIN and the literal word "India" from the remaining string.
 *  3.  Split the cleaned remainder by comma (,) or newline (\n).
 *  4.  Assign from the tail:  last segment → state, second-to-last → city.
 *  5.  Everything before city/state → address lines (sanitized).
 *
 * Fallback rules (prevent crashes on chaotic input):
 *  •  0 or 1 usable segments after PIN extraction
 *     → dump sanitized text into line1, leave city/state empty.
 *  •  Exactly 2 usable segments
 *     → treat them as city + state, leave address lines empty.
 *  •  PIN not found → pincode returned as "" (parseSuccess: false).
 *
 * @param   {string} raw   Free-form address text
 * @returns {{
 *   line1:        string,
 *   line2:        string,
 *   pincode:      string,
 *   city:         string,
 *   state:        string,
 *   parseSuccess: boolean   — true if a valid PIN was found AND structure was resolved
 * }}
 */
export function parseRawAddress(raw) {
  // ── Guard: nothing to parse ───────────────────────────────────────────────
  if (!raw || typeof raw !== "string") {
    return { line1: "", line2: "", pincode: "", city: "", state: "", parseSuccess: false };
  }

  // ── Step 1: Extract 6-digit PIN code ─────────────────────────────────────
  // PINCODE_REGEX has a capture group — pincodeMatch[1] is the digit string.
  const pincodeMatch = raw.match(PINCODE_REGEX);
  const pincode = pincodeMatch ? pincodeMatch[1] : "";

  // ── Step 2: Strip PIN + "India" from the string ───────────────────────────
  let cleaned = raw
    .replace(PINCODE_REGEX, "")     // remove the 6-digit PIN wherever it appears
    .replace(/\bindia\b/gi, "")     // remove literal "India" (case-insensitive)
    .trim();

  // Remove leading / trailing separators left behind after extraction
  cleaned = cleaned.replace(/^[\s,\n]+|[\s,\n]+$/g, "").trim();

  // ── Step 3: Tokenise by comma or newline ──────────────────────────────────
  const parts = cleaned
    .split(/[,\n]/)       // split on commas OR newlines
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // ── Fallback A: 0 or 1 usable parts → dump into line1 ────────────────────
  if (parts.length <= 1) {
    return {
      line1:        sanitizeAddressLine(parts[0] ?? cleaned),
      line2:        "",
      pincode,
      city:         "",
      state:        "",
      parseSuccess: Boolean(pincode && parts[0]),
    };
  }

  // ── Fallback B: Exactly 2 parts → city + state only ──────────────────────
  if (parts.length === 2) {
    return {
      line1:        "",
      line2:        "",
      pincode,
      city:         parts[0],
      state:        parts[1],
      parseSuccess: Boolean(pincode),
    };
  }

  // ── Step 4: Assign from the tail ─────────────────────────────────────────
  //   last segment             → state
  //   second-to-last segment   → city
  //   everything before        → address line segments
  const state         = parts[parts.length - 1];
  const city          = parts[parts.length - 2];
  const addrSegments  = parts.slice(0, parts.length - 2);

  // First segment → Line 1; any further segments merged → Line 2
  const line1 = sanitizeAddressLine(addrSegments[0] ?? "");
  const line2 = sanitizeAddressLine(addrSegments.slice(1).join(", "));

  return {
    line1,
    line2,
    pincode,
    city,
    state,
    parseSuccess: true,
  };
}
