import React from "react";

/**
 * Surface container. `tone` sets the register; `interactive` enables hover-lift.
 */
export function Card({
  tone = "light",
  interactive = false,
  padded = true,
  children,
  style = {},
  ...rest
}) {
  const tones = {
    light: { background: "var(--surface-card)", color: "var(--text-primary)", border: "var(--border-width) solid var(--border-default)" },
    subtle: { background: "var(--surface-subtle)", color: "var(--text-primary)", border: "var(--border-width) solid var(--border-default)" },
    dark: { background: "var(--rb-black)", color: "var(--rb-white)", border: "none" },
    red: { background: "var(--color-accent)", color: "var(--color-on-accent)", border: "none" },
  };

  return (
    <div
      className={interactive ? "rb-card--interactive" : undefined}
      style={{
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        padding: padded ? "var(--space-5)" : 0,
        ...tones[tone],
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
