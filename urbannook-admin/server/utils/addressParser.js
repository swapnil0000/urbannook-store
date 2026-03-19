/**
 * Parses an Indian address string into structured components.
 *
 * Expected input format (comma-separated):
 *   "House/Street, Area, City, State, 123456"
 *   or any variation that includes a 6-digit pincode.
 *
 * Returns:
 *   { addressLine1, city, state, pincode, parseSuccess }
 *
 * parseSuccess is false if no valid 6-digit pincode is found.
 */
function parseAddress(raw) {
  if (!raw || typeof raw !== "string") {
    return { addressLine1: "", city: "", state: "", pincode: "", parseSuccess: false };
  }

  // 1. Extract 6-digit Indian pincode
  const pincodeMatch = raw.match(/\b[1-9][0-9]{5}\b/);
  if (!pincodeMatch) {
    return { addressLine1: "", city: "", state: "", pincode: "", parseSuccess: false };
  }
  const pincode = pincodeMatch[0];

  // 2. Strip pincode and "India" (case-insensitive) from the string
  let cleaned = raw
    .replace(pincode, "")
    .replace(/\bindia\b/gi, "")
    .trim();

  // Remove leading/trailing commas left behind
  cleaned = cleaned.replace(/^,+|,+$/g, "").trim();

  // 3. Split by comma, trim, drop empty parts
  const parts = cleaned
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0) {
    return { addressLine1: "", city: "", state: "", pincode, parseSuccess: false };
  }

  // 4. Last part = state, second-to-last = city, rest = addressLine1
  const state = parts[parts.length - 1];
  const city = parts.length >= 2 ? parts[parts.length - 2] : state;
  const addressParts = parts.length >= 3 ? parts.slice(0, parts.length - 2) : [];
  const addressLine1 = addressParts.join(", ") || city;

  return { addressLine1, city, state, pincode, parseSuccess: true };
}

module.exports = { parseAddress };
