import React from "react";

/**
 * Filter / category tag. Sentence-or-upper case, selectable. Optional onClick.
 */
export function Tag({ active = false, as = "span", onClick, children, style = {}, ...rest }) {
  const interactive = typeof onClick === "function" || as === "button";
  const Comp = as;
  return (
    <Comp
      onClick={onClick}
      className={interactive ? "rb-tag--button" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4em",
        fontFamily: "var(--font-body)",
        fontWeight: "var(--fw-semibold)",
        fontSize: "0.8125rem",
        letterSpacing: "0.01em",
        lineHeight: 1,
        padding: "0.5em 0.9em",
        borderRadius: "var(--radius-pill)",
        border: "var(--border-width) solid var(--border-default)",
        background: active ? "var(--rb-ink)" : "transparent",
        color: active ? "var(--rb-white)" : "var(--text-primary)",
        borderColor: active ? "var(--rb-ink)" : "var(--border-default)",
        cursor: interactive ? "pointer" : "default",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
}
