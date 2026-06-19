import React from "react";

/**
 * Overline / kicker. Wide-tracked uppercase, red by default, with a tick mark.
 */
export function Eyebrow({ tick = true, color, as = "div", children, style = {}, ...rest }) {
  const Comp = as;
  return (
    <Comp
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.6em",
        fontFamily: "var(--font-display)",
        fontWeight: "var(--fw-bold)",
        textTransform: "uppercase",
        letterSpacing: "var(--ls-eyebrow)",
        fontSize: "var(--fs-eyebrow)",
        color: color || "var(--text-accent)",
        ...style,
      }}
      {...rest}
    >
      {tick && (
        <span
          aria-hidden="true"
          style={{ width: "1.75em", height: "var(--border-width-heavy)", background: "currentColor", display: "inline-block" }}
        />
      )}
      {children}
    </Comp>
  );
}
