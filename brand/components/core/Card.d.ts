import * as React from "react";

export type CardTone = "light" | "subtle" | "dark" | "red";

/**
 * Surface container for trip cards, coach cards, feature blocks.
 *
 * @startingPoint section="Core" subtitle="Surface cards in 4 tones" viewport="700x300"
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Colour register. `dark`/`red` are the high-impact brand surfaces. */
  tone?: CardTone;
  /** Enable hover-lift + pointer (use for clickable cards). */
  interactive?: boolean;
  /** Apply default inner padding. Set false for full-bleed media cards. */
  padded?: boolean;
  children?: React.ReactNode;
}

export function Card(props: CardProps): JSX.Element;
