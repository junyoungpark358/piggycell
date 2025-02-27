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

// 텍스트 스타일 타입 정의
export interface TextStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: string;
  textTransform?: string;
}

export interface Typography {
  fontFamily: {
    primary: string;
    secondary: string;
    display: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
    h1?: string;
    h2?: string;
    h3?: string;
    h4?: string;
  };
  fontWeight: {
    light?: number;
    regular: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal?: number;
    relaxed: number;
  };
  textStyle?: {
    h1?: TextStyle;
    h2?: TextStyle;
    h3?: TextStyle;
    h4?: TextStyle;
    body1?: TextStyle;
    body2?: TextStyle;
    button?: TextStyle;
    caption?: TextStyle;
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
