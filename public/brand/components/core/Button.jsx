import React from "react";

/**
 * Rockbusters Button — bold, uppercase, pill. Red is the primary weapon.
 */
export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  fullWidth = false,
  leftIcon = null,
  rightIcon = null,
  children,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { fontSize: "0.75rem", padding: "0.5rem 1rem", gap: "0.4rem" },
    md: { fontSize: "0.8125rem", padding: "0.75rem 1.6rem", gap: "0.5rem" },
    lg: { fontSize: "0.9375rem", padding: "1rem 2.2rem", gap: "0.6rem" },
  };

  const variants = {
    primary: {
      background: "var(--color-accent)",
      color: "var(--color-on-accent)",
      border: "var(--border-width-bold) solid var(--color-accent)",
    },
    dark: {
      background: "var(--rb-black)",
      color: "var(--rb-white)",
      border: "var(--border-width-bold) solid var(--rb-black)",
    },
    outline: {
      background: "transparent",
      color: "var(--text-primary)",
      border: "var(--border-width-bold) solid var(--border-strong)",
    },
    "outline-invert": {
      background: "transparent",
      color: "var(--rb-white)",
      border: "var(--border-width-bold) solid var(--rb-white)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-accent)",
      border: "var(--border-width-bold) solid transparent",
    },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`rb-btn rb-btn--${variant}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: sizes[size].gap,
        fontFamily: "var(--font-display)",
        fontWeight: "var(--fw-bold)",
        textTransform: "uppercase",
        letterSpacing: "var(--ls-button)",
        lineHeight: 1,
        borderRadius: "var(--radius-pill)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        width: fullWidth ? "100%" : "auto",
        transition:
          "transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast)",
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
