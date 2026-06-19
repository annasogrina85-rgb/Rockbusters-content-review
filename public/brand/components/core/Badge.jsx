import React from "react";

/**
 * Small status/label badge. Uppercase, tight, pill or square.
 */
export function Badge({ variant = "red", shape = "pill", children, style = {}, ...rest }) {
  const variants = {
    red: { background: "var(--color-accent)", color: "var(--color-on-accent)" },
    black: { background: "var(--rb-black)", color: "var(--rb-white)" },
    outline: { background: "transparent", color: "var(--text-primary)", boxShadow: "inset 0 0 0 var(--border-width-bold) var(--border-strong)" },
    light: { background: "var(--rb-grey-100)", color: "var(--text-primary)" },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35em",
        fontFamily: "var(--font-display)",
        fontWeight: "var(--fw-bold)",
        fontSize: "0.6875rem",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        lineHeight: 1,
        padding: "0.4em 0.75em",
        borderRadius: shape === "pill" ? "var(--radius-pill)" : "var(--radius-sm)",
        whiteSpace: "nowrap",
        ...variants[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
