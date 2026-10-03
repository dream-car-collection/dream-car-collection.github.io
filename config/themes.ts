import type { ThemeConfig, ThemePresetName } from "./types";

export const themes: Partial<Record<ThemePresetName, ThemeConfig>> = {
  "obsidian-red": {
    name: "obsidian-red" as ThemePresetName,
    label: "Site Theme",
    description: "Selected site theme",
    tokens: {
  "background": "226 49% 8%",
  "foreground": "0 0% 99%",
  "card": "226 49% 13%",
  "card-foreground": "0 0% 99%",
  "primary": "189 94% 43%",
  "primary-foreground": "0 0% 0%",
  "secondary": "226 49% 19%",
  "muted": "226 49% 16%",
  "muted-foreground": "0 0% 99%",
  "border": "226 49% 24%",
  "radius": ".75rem",
  "card-shadow": "0 22px 70px hsl(189 94% 43% / .16)",
  "hero-gradient": "radial-gradient(circle at 78% 14%, hsl(189 94% 43% / .2), transparent 36%)",
  "background-pattern": "radial-gradient(hsl(189 94% 43% / .05) 1px, transparent 1px)",
  "font-sans": "\"Inter\", ui-sans-serif, system-ui, sans-serif",
  "font-heading": "\"Inter\", ui-sans-serif, system-ui, sans-serif",
  "heading-weight": "700",
  "heading-letter-spacing": "-0.03em"
},
  },
};
