import * as React from "react";

/** Text input with uppercase label, crisp 2px border and red focus ring. */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Uppercase field label rendered above the input. */
  label?: string;
  /** Helper / error text below. */
  hint?: string;
  /** Show red error border + hint colour. */
  invalid?: boolean;
}

export function Input(props: InputProps): JSX.Element;
