import * as React from "react";

/** Big numeric brand stat — the "flex" numbers (100%, 1:6, 30+ legends). */
export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The number/short string to shout. */
  value: React.ReactNode;
  /** Uppercase caption under it. */
  label: React.ReactNode;
  /** Colour the number red (default) or inherit. */
  accent?: boolean;
  align?: "left" | "center";
}

export function Stat(props: StatProps): JSX.Element;
