import * as React from "react";

/** Filter / category chip. Outline by default; fills ink when `active`. */
export interface TagProps extends React.HTMLAttributes<HTMLElement> {
  active?: boolean;
  /** Render as "span" (default) or "button". */
  as?: "span" | "button";
  onClick?: React.MouseEventHandler;
  children?: React.ReactNode;
}

export function Tag(props: TagProps): JSX.Element;
