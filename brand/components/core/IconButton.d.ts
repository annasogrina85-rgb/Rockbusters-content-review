import * as React from "react";

export type IconButtonVariant = "solid" | "dark" | "outline" | "ghost";
export type IconButtonSize = "sm" | "md" | "lg";

/**
 * Circular icon-only button. Always pass `aria-label`. Children = a 20–24px icon node.
 */
export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  "aria-label": string;
  children?: React.ReactNode;
}

export function IconButton(props: IconButtonProps): JSX.Element;
