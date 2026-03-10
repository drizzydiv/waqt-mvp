const accent = "#3D9970";
const accentLight = "#E8F5E9";
const accentDark = "#2E7D5A";

const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#6B6B6B",
    textTertiary: "#9E9E9E",
    background: "#FAFAFA",
    backgroundSecondary: "#F0F0F0",
    card: "#FFFFFF",
    cardBorder: "#EFEFEF",
    tint: accent,
    tintLight: accentLight,
    tintDark: accentDark,
    tabIconDefault: "#BDBDBD",
    tabIconSelected: accent,
    border: "#E8E8E8",
    destructive: "#E53935",
    success: accent,
    warning: "#FF9800",
  },
  dark: {
    text: "#F5F5F5",
    textSecondary: "#A0A0A0",
    textTertiary: "#6B6B6B",
    background: "#0A0A0A",
    backgroundSecondary: "#1A1A1A",
    card: "#141414",
    cardBorder: "#252525",
    tint: accent,
    tintLight: "#1B3A2A",
    tintDark: accentDark,
    tabIconDefault: "#555",
    tabIconSelected: accent,
    border: "#2A2A2A",
    destructive: "#EF5350",
    success: accent,
    warning: "#FFB74D",
  },
  event: {
    red: "#E53935",
    orange: "#FF9800",
    yellow: "#FDD835",
    green: "#43A047",
    blue: "#1E88E5",
    purple: "#8E24AA",
    pink: "#E91E63",
    teal: "#00897B",
    indigo: "#3949AB",
    gray: "#757575",
  },
  priority: {
    high: "#E53935",
    medium: "#FF9800",
    low: "#43A047",
  },
};

export default Colors;

export function useThemeColors(colorScheme: "light" | "dark" | null | undefined) {
  return colorScheme === "dark" ? Colors.dark : Colors.light;
}
