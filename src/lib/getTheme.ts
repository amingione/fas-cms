// src/lib/getTheme.ts
import themeJson from '../../content/theme.json';

export type Theme = {
  brandName: string;
  colors: {
    primary: string;
    secondary?: string;
    accent?: string;
    background?: string;
    foreground?: string;
  };
  buttons?: { variant: string; className?: string }[];
};

export async function getTheme(): Promise<Theme> {
  return themeJson as Theme;
}
