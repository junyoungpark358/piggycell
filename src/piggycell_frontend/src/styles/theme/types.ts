export interface ColorToken {
  main: string;
  light: string;
  dark: string;
}

export interface Colors {
  primary: ColorToken;
  secondary: ColorToken;
  success: ColorToken;
  error: ColorToken;
  warning: ColorToken;
  info: ColorToken;
  neutral: {
    white: string;
    black: string;
    gray: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
  };
  background: {
    default: string;
    paper: string;
    card: string;
  };
  text: {
    primary: string;
    secondary: string;
  };
  border: {
    default: string;
    hover: string;
    focus: string;
  };
}

export interface Typography {
  fontFamily: {
    primary: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  fontWeight: {
    regular: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    relaxed: number;
  };
}

export interface Spacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface BorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
}

export interface Shadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface Theme {
  colors: Colors;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
}
