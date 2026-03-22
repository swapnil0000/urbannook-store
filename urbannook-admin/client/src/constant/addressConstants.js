/**
 * Address Input — Shared Constants
 *
 * Centralises every regex pattern, limit, and human-readable string
 * used by the SmartAddressInput component and its parser utility.
 * Change once here — propagates everywhere.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PINCODE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Matches a valid 6-digit Indian PIN code.
 *
 * Rules:
 *   • First digit must be 1–9  (Indian PINs never start with 0)
 *   • Followed by exactly 5 more digits
 *   • Word-boundary (\b) anchors prevent a false match inside longer digit runs
 *     e.g. "9122003" must NOT match as "122003".
 *
 * Capture group 1 → the PIN string itself (used in parseRawAddress).
 */
export const PINCODE_REGEX = /\b([1-9][0-9]{5})\b/;

// ─────────────────────────────────────────────────────────────────────────────
// ADDRESS LINE SANITIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Matches any character that is NOT permitted in an address line.
 *
 * Permitted characters:
 *   a-z A-Z   — letters (any case)
 *   0-9       — digits
 *   (space)   — word separator
 *   .         — period  (e.g. "St. Mary's Rd.")
 *   ,         — comma   (e.g. "Sector 12, Block B")
 *   -         — hyphen  (e.g. "B-42")
 *   /         — slash   (e.g. "10/2 Main Road")
 *   #         — hash    (e.g. "#5 Cross Street")
 *
 * Usage: str.replace(ADDR_FORBIDDEN_CHARS_REGEX, "")
 * The 'g' flag strips ALL occurrences in one pass.
 */
export const ADDR_FORBIDDEN_CHARS_REGEX = /[^a-zA-Z0-9 .,\-\/#]/g;

/**
 * Hint text displayed beneath Address Line 1 and Line 2 inputs.
 * Update this string if the allowed-chars list ever changes.
 */
export const ADDR_SPECIAL_CHARS_HINT = "Only these special characters are allowed: . , - / #";

// ─────────────────────────────────────────────────────────────────────────────
// FORM CONFIG
// ─────────────────────────────────────────────────────────────────────────────

/** Fields that must be non-empty for a valid address submission. */
export const ADDR_REQUIRED_FIELDS = ["line1", "pincode", "city", "state"];

/** Human-readable labels used in validation error messages. */
export const ADDR_FIELD_LABELS = {
  raw:    "Full Address",
  line1:  "Address Line 1",
  line2:  "Address Line 2",
  pincode:"Pincode",
  city:   "City",
  state:  "State",
};

/**
 * Milliseconds to wait after the user stops typing in the raw textarea
 * before triggering the smart field-level parse.
 * Lower = more responsive but may interrupt mid-word.
 * Higher = safer but slight lag on fast paste.
 */
export const PARSE_DEBOUNCE_MS = 380;
