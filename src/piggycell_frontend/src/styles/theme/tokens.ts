import { Theme } from "./types";

export const lightTheme: Theme = {
  colors: {
    primary: {
      main: "#1A73E8",
      light: "#4285F4",
      dark: "#0D47A1",
    },
    secondary: {
      main: "#34A853",
      light: "#66BB6A",
      dark: "#1B5E20",
    },
    success: {
      main: "#1E8E3E",
      light: "#34A853",
      dark: "#0D652D",
    },
    error: {
      main: "#D93025",
      light: "#EA4335",
      dark: "#B31412",
    },
    warning: {
      main: "#F29900",
      light: "#FBB03B",
      dark: "#E37400",
    },
    info: {
      main: "#1A73E8",
      light: "#4285F4",
      dark: "#0D47A1",
    },
    neutral: {
      white: "#FFFFFF",
      black: "#000000",
      gray: {
        50: "#F8F9FA",
        100: "#F1F3F4",
        200: "#E8EAED",
        300: "#DADCE0",
        400: "#BDC1C6",
        500: "#9AA0A6",
        600: "#80868B",
        700: "#5F6368",
        800: "#3C4043",
        900: "#202124",
      },
    },
    background: {
      default: "#F8F9FA",
      paper: "#FFFFFF",
      card: "rgba(255, 255, 255, 0.9)",
    },
    text: {
      primary: "#202124",
      secondary: "#5F6368",
    },
    border: {
      default: "#E2E8F0",
      hover: "#60A5FA",
      focus: "#3B82F6",
    },
  },
  typography: {
    fontFamily: {
      primary:
        '"Pretendard", -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif',
    },
    fontSize: {
      xs: "12px",
      sm: "14px",
      md: "16px",
      lg: "18px",
      xl: "20px",
      xxl: "24px",
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      relaxed: 1.75,
    },
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  borderRadius: {
    none: "0",
    sm: "4px",
    md: "8px",
    lg: "12px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },
};

export const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    primary: {
      main: "#60A5FA",
      light: "#93C5FD",
      dark: "#2563EB",
    },
    secondary: {
      main: "#4ADE80",
      light: "#86EFAC",
      dark: "#16A34A",
    },
    neutral: {
      white: "#1A1B1E",
      black: "#FFFFFF",
      gray: {
        50: "#202124",
        100: "#3C4043",
        200: "#5F6368",
        300: "#80868B",
        400: "#9AA0A6",
        500: "#BDC1C6",
        600: "#DADCE0",
        700: "#E8EAED",
        800: "#F1F3F4",
        900: "#F8F9FA",
      },
    },
    error: "#EF4444",
    warning: "#F59E0B",
    success: "#10B981",
    info: "#60A5FA",
    background: {
      default: "#1A1B1E",
      paper: "#202124",
      card: "rgba(32, 33, 36, 0.9)",
    },
    text: {
      primary: "#F8F9FA",
      secondary: "#E8EAED",
      disabled: "#9AA0A6",
    },
    border: {
      default: "#3C4043",
      hover: "#60A5FA",
      focus: "#3B82F6",
    },
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.4)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.4)",
  },
};

export type ThemeMode = "light" | "dark";

export const getTheme = (mode: ThemeMode) => {
  return mode === "light" ? lightTheme : darkTheme;
};

// 기존 colors export를 유지하여 이전 코드와의 호환성 유지
export const colors = lightTheme.colors;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
};

export const typography = {
  fontFamily: {
    primary:
      '"Pretendard", -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif',
  },
  fontSize: {
    xs: "12px",
    sm: "14px",
    md: "16px",
    lg: "18px",
    xl: "20px",
    xxl: "24px",
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const borderRadius = {
  none: "0",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
};

export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
};

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};
