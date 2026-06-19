import * as React from "react";

export type ButtonVariant =
  | "primary"
  | "dark"
  | "outline"
  | "outline-invert"
  | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Bold uppercase pill button — the primary call-to-action element.
 * Red `primary` is the brand weapon; use one per view.
 *
 * @startingPoint section="Core" subtitle="Bold uppercase pill buttons" viewport="700x220"
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. `primary` = red, `dark` = black, `outline-invert` for dark bgs. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Icon node rendered before the label. */
  leftIcon?: React.ReactNode;
  /** Icon node rendered after the label. */
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;
