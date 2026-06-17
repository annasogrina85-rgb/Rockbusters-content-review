import React from "react";

/**
 * Text input with optional label. Crisp border, red focus ring.
 */
export function Input({
  label,
  id,
  type = "text",
  invalid = false,
  hint,
  style = {},
  ...rest
}) {
  const inputId = id || (label ? `rb-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", ...style }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--fw-bold)",
            textTransform: "uppercase",
            letterSpacing: "var(--ls-eyebrow)",
            fontSize: "var(--fs-eyebrow)",
            color: "var(--text-primary)",
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className="rb-input"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--fs-body)",
          color: "var(--text-primary)",
          background: "var(--surface-card)",
          padding: "0.75rem 1rem",
          borderRadius: "var(--radius-md)",
          border: `var(--border-width-bold) solid ${invalid ? "var(--color-accent)" : "var(--border-default)"}`,
          width: "100%",
        }}
        {...rest}
      />
      {hint && (
        <span style={{ fontSize: "var(--fs-small)", color: invalid ? "var(--text-accent)" : "var(--text-secondary)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}
