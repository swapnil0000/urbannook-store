/**
 * SmartAddressInput
 *
 * Two-way synchronized address form component.
 *
 * Layout (top → bottom):
 *   ① Raw textarea  — paste/type a full address (WhatsApp style)
 *   ── OR divider ──
 *   ② Address Line 1  (required)
 *   ③ Address Line 2  (optional)
 *   ④ Pincode | City | State  (pincode + city required)
 *
 * Two-way sync:
 *   • Form → Text  : any discrete field change rebuilds raw immediately (synchronous)
 *   • Text → Form  : raw textarea change debounces 380ms, then smart-parses into fields
 *
 * Strict char restriction on Line 1 / Line 2:
 *   Only a-z A-Z 0-9 space . , - / # are allowed (others stripped silently on keydown)
 *
 * Props:
 *   value    {string | { line1, line2, pincode, city, state, raw? }}
 *              — controlled value; string treated as raw address
 *   onChange {(structured: { line1, line2, pincode, city, state, raw }) => void}
 *   errors   {{ [field]: string }}  — external validation errors (e.g. from parent form)
 *   disabled {boolean}
 *   label    {string}  — optional section label (default "Delivery Address")
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  sanitizeAddressLine,
  buildRawAddress,
  parseRawAddress,
} from "../utils/addressParser";
import {
  ADDR_SPECIAL_CHARS_HINT,
  ADDR_REQUIRED_FIELDS,
  ADDR_FIELD_LABELS,
  PARSE_DEBOUNCE_MS,
} from "../constant/addressConstants";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FIELDS = {
  raw: "",
  line1: "",
  line2: "",
  pincode: "",
  city: "",
  state: "",
};

/**
 * Normalises the incoming `value` prop into the internal `fields` shape.
 * Accepts either a string (→ raw only) or a structured object.
 */
function initFromValue(value) {
  if (!value) return { ...EMPTY_FIELDS };
  if (typeof value === "string") {
    return { ...EMPTY_FIELDS, raw: value };
  }
  // Structured object — rebuild raw from fields if raw is absent
  const {
    line1 = "",
    line2 = "",
    pincode = "",
    city = "",
    state = "",
    raw = "",
  } = value;
  const resolvedRaw =
    raw || buildRawAddress({ line1, line2, pincode, city, state });
  return { raw: resolvedRaw, line1, line2, pincode, city, state };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared style helpers (use workspace CSS vars)
// ─────────────────────────────────────────────────────────────────────────────

const baseInputStyle = {
  background: "var(--color-urban-raised)",
  border: "1px solid var(--color-urban-border)",
  color: "var(--color-urban-text)",
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
  transition: "border-color 0.15s",
};

const errorInputStyle = {
  ...baseInputStyle,
  border: "1px solid #f87171",
};

const labelStyle = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "0.3rem",
  color: "var(--color-urban-text-muted)",
};

const errorTextStyle = {
  fontSize: "0.7rem",
  color: "#f87171",
  marginTop: "0.25rem",
};

const hintTextStyle = {
  fontSize: "0.7rem",
  color: "var(--color-urban-text-muted)",
  marginTop: "0.25rem",
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: a single labelled input field
// ─────────────────────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  required,
  value,
  onChange,
  onBlur,
  disabled,
  error,
  hint,
  maxLength,
  type = "text",
  style,
}) {
  const hasError = Boolean(error);
  return (
    <div style={style}>
      <label htmlFor={id} style={labelStyle}>
        {label}
        {required && <span style={{ color: "#f87171", marginLeft: 2 }}>*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        maxLength={maxLength}
        style={hasError ? errorInputStyle : baseInputStyle}
        aria-required={required}
        aria-invalid={hasError}
      />
      {hasError && <p style={errorTextStyle}>{error}</p>}
      {!hasError && hint && <p style={hintTextStyle}>{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function SmartAddressInput({
  value,
  onChange,
  errors: externalErrors = {},
  disabled = false,
  label = "Delivery Address",
}) {
  // ── Internal field state ──────────────────────────────────────────────────
  const [fields, setFields] = useState(() => initFromValue(value));

  // ── Touched state — enables blur-based error display ─────────────────────
  const [touched, setTouched] = useState({});

  // ── Ref so debounced callbacks always see latest fields ───────────────────
  const fieldsRef = useRef(fields);
  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  // ── Debounce timer ref ────────────────────────────────────────────────────
  const debounceRef = useRef(null);

  // ── Notify parent of current state ───────────────────────────────────────
  const notifyParent = useCallback(
    (next) => {
      if (typeof onChange === "function") {
        onChange({
          line1: next.line1,
          line2: next.line2,
          pincode: next.pincode,
          city: next.city,
          state: next.state,
          raw: next.raw,
        });
      }
    },
    [onChange],
  );

  // ── Sync from external value prop when it changes ─────────────────────────
  // (only on first meaningful external change — controlled use case)
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      const next = initFromValue(value);
      setFields(next);
    }
  }, [value]);

  // ── Handler: raw textarea change (Text → Form) ────────────────────────────
  const handleRawChange = useCallback(
    (e) => {
      const raw = e.target.value;

      // Update raw field immediately (so textarea feels responsive)
      setFields((prev) => {
        const next = { ...prev, raw };
        fieldsRef.current = next;
        return next;
      });

      // Debounce the parse (Text → Form direction)
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const parsed = parseRawAddress(raw);
        setFields((prev) => {
          const next = {
            raw,
            line1: parsed.line1 !== "" ? parsed.line1 : prev.line1,
            line2: parsed.line2 !== "" ? parsed.line2 : prev.line2,
            pincode: parsed.pincode !== "" ? parsed.pincode : prev.pincode,
            city: parsed.city !== "" ? parsed.city : prev.city,
            state: parsed.state !== "" ? parsed.state : prev.state,
          };
          // Only override if parse actually found structure
          const merged = parsed.parseSuccess ? next : { ...prev, raw };
          fieldsRef.current = merged;
          notifyParent(merged);
          return merged;
        });
      }, PARSE_DEBOUNCE_MS);
    },
    [notifyParent],
  );

  // ── Handler: discrete field change (Form → Text) ──────────────────────────
  const handleFieldChange = useCallback(
    (field, rawValue) => {
      const sanitized =
        field === "line1" || field === "line2"
          ? sanitizeAddressLine(rawValue)
          : rawValue;

      setFields((prev) => {
        const next = { ...prev, [field]: sanitized };
        // Rebuild raw synchronously
        next.raw = buildRawAddress(next);
        fieldsRef.current = next;
        notifyParent(next);
        return next;
      });
    },
    [notifyParent],
  );

  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // ── Cleanup debounce on unmount ───────────────────────────────────────────
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // ── Compute visible errors (external wins; internal only when touched) ────
  const getError = (field) => {
    if (externalErrors[field]) return externalErrors[field];
    if (
      touched[field] &&
      ADDR_REQUIRED_FIELDS.includes(field) &&
      !fields[field]
    ) {
      return `${ADDR_FIELD_LABELS[field]} is required`;
    }
    return null;
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  };

  const orDividerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    color: "var(--color-urban-text-muted)",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };

  const orLineStyle = {
    flex: 1,
    height: 1,
    background: "var(--color-urban-border)",
  };

  const threeColStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1.5fr 1.5fr",
    gap: "0.75rem",
  };

  const rawHasError = Boolean(externalErrors.raw);

  return (
    <div style={containerStyle}>
      {/* Section label */}
      {label && (
        <p
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "var(--color-urban-text-sec)",
            marginBottom: -4,
          }}
        >
          {label}
        </p>
      )}

      {/* ── Raw textarea ─────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="smart-addr-raw" style={labelStyle}>
          {ADDR_FIELD_LABELS.raw}
        </label>
        <textarea
          id="smart-addr-raw"
          value={fields.raw}
          onChange={handleRawChange}
          onBlur={() => handleBlur("raw")}
          disabled={disabled}
          rows={3}
          placeholder={
            "Paste full address here, it will be parsed automatically…"
          }
          style={{
            ...(rawHasError ? errorInputStyle : baseInputStyle),
            resize: "vertical",
            minHeight: "5rem",
            lineHeight: 1.5,
          }}
          aria-label="Full address (raw)"
          aria-invalid={rawHasError}
        />
        {rawHasError && <p style={errorTextStyle}>{externalErrors.raw}</p>}
        {/* {!rawHasError && (
          <p style={hintTextStyle}>
            Paste a full address and fields below will auto-fill.
          </p>
        )} */}
      </div>

      {/* ── OR divider ───────────────────────────────────────────────────── */}
      <div style={orDividerStyle}>
        <div style={orLineStyle} />
        <span>or fill manually</span>
        <div style={orLineStyle} />
      </div>

      {/* ── Address Line 1 ───────────────────────────────────────────────── */}
      <Field
        id="smart-addr-line1"
        label={ADDR_FIELD_LABELS.line1}
        required
        value={fields.line1}
        onChange={(e) => handleFieldChange("line1", e.target.value)}
        onBlur={() => handleBlur("line1")}
        disabled={disabled}
        error={getError("line1")}
        hint={ADDR_SPECIAL_CHARS_HINT}
        maxLength={120}
      />

      {/* ── Address Line 2 ───────────────────────────────────────────────── */}
      <Field
        id="smart-addr-line2"
        label={ADDR_FIELD_LABELS.line2}
        value={fields.line2}
        onChange={(e) => handleFieldChange("line2", e.target.value)}
        onBlur={() => handleBlur("line2")}
        disabled={disabled}
        error={getError("line2")}
        hint={ADDR_SPECIAL_CHARS_HINT}
        maxLength={120}
      />

      {/* ── Pincode | City | State ───────────────────────────────────────── */}
      <div style={threeColStyle}>
        <Field
          id="smart-addr-pincode"
          label={ADDR_FIELD_LABELS.pincode}
          required
          type="text"
          value={fields.pincode}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            handleFieldChange("pincode", v);
          }}
          onBlur={() => handleBlur("pincode")}
          disabled={disabled}
          error={getError("pincode")}
          maxLength={6}
        />
        <Field
          id="smart-addr-city"
          label={ADDR_FIELD_LABELS.city}
          required
          value={fields.city}
          onChange={(e) => handleFieldChange("city", e.target.value)}
          onBlur={() => handleBlur("city")}
          disabled={disabled}
          error={getError("city")}
          maxLength={60}
        />
        <Field
          id="smart-addr-state"
          label={ADDR_FIELD_LABELS.state}
          required
          value={fields.state}
          onChange={(e) => handleFieldChange("state", e.target.value)}
          onBlur={() => handleBlur("state")}
          disabled={disabled}
          error={getError("state")}
          maxLength={60}
        />
      </div>
    </div>
  );
}
