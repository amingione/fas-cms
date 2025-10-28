import type { MouseEventHandler, ReactNode } from 'react';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'default';

export interface ButtonProps {
  href?: string;
  text?: ReactNode;
  children?: ReactNode;
  className?: string;
  size?: ButtonSize;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  [key: string]: any;
}

export default function Button(props: ButtonProps): JSX.Element;
