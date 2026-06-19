import React from "react";

/**
 * Big numeric flex stat — "100%", "1:6", "30+". Number shouts, label whispers.
 */
export function Stat({ value, label, accent = true, align = "left", style = {}, ...rest }) {
  return (
    <div style={{ textAlign: align, ...style }} {...rest}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: "var(--fw-black)",
          fontSize: "var(--fs-display-2)",
          lineHeight: 0.9,
          letterSpacing: "var(--ls-display)",
          color: accent ? "var(--text-accent)" : "inherit",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: "var(--space-2)",
          fontFamily: "var(--font-display)",
          fontWeight: "var(--fw-bold)",
          textTransform: "uppercase",
          letterSpacing: "var(--ls-eyebrow)",
          fontSize: "var(--fs-eyebrow)",
          color: "inherit",
          opacity: 0.7,
        }}
      >
        {label}
      </div>
    </div>
  );
}
