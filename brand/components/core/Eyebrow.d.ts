import * as React from "react";

/** Overline / section kicker — wide-tracked red uppercase with a lead-in rule. */
export interface EyebrowProps extends React.HTMLAttributes<HTMLElement> {
  /** Show the short rule before the text. */
  tick?: boolean;
  /** Override colour (e.g. white on dark sections). */
  color?: string;
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export function Eyebrow(props: EyebrowProps): JSX.Element;
