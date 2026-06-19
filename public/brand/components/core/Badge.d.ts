import * as React from "react";

export type BadgeVariant = "red" | "black" | "outline" | "light";
export type BadgeShape = "pill" | "square";

/** Small uppercase status/label badge — "NEW", difficulty grades, trip type. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  shape?: BadgeShape;
  children?: React.ReactNode;
}

export function Badge(props: BadgeProps): JSX.Element;
