import React from "react";

/**
 * Square-ish pill icon button. Pass a Lucide icon (or any node) as children.
 */
export function IconButton({
  variant = "solid",
  size = "md",
  type = "button",
  disabled = false,
  "aria-label": ariaLabel,
  children,
  style = {},
  ...rest
}) {
  const dim = { sm: 32, md: 40, lg: 48 }[size];

  const variants = {
    solid: { background: "var(--color-accent)", color: "var(--color-on-accent)", border: "none" },
    dark: { background: "var(--rb-black)", color: "var(--rb-white)", border: "none" },
    outline: { background: "transparent", color: "var(--text-primary)", border: "var(--border-width-bold) solid var(--border-strong)" },
    ghost: { background: "transparent", color: "var(--text-primary)", border: "none" },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`rb-iconbtn rb-iconbtn--${variant}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dim,
        height: dim,
        borderRadius: "var(--radius-pill)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        ...variants[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
