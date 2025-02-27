/**
 * 애플리케이션 전체에서 사용하는 타이포그래피 시스템
 * 일관된 폰트 스타일을 유지하기 위한 중앙 관리 파일
 */

// 각 스타일 목적에 맞는 폰트 패밀리
export const fontFamily = {
  // 기본 본문 텍스트에 사용 (대부분의 컴포넌트)
  primary:
    '"Pretendard", -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif',

  // 부가적인 본문 텍스트에 사용 (덜 강조하는 텍스트)
  secondary:
    '"Nunito", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',

  // 제목, 헤더, 강조 텍스트 등에 사용
  display: '"Bangers", cursive',
};

// 텍스트 크기 체계
export const fontSize = {
  xs: "12px",
  sm: "14px",
  md: "16px",
  lg: "18px",
  xl: "20px",
  xxl: "24px",
  // 제목용 특수 사이즈
  h1: "32px",
  h2: "28px",
  h3: "24px",
  h4: "20px",
};

// 폰트 굵기 시스템
export const fontWeight = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

// 라인 높이 시스템
export const lineHeight = {
  tight: 1.25, // 제목, 헤더에 적합
  normal: 1.5, // 대부분의 본문 텍스트에 적합
  relaxed: 1.75, // 긴 문단 텍스트에 적합
};

// 특수 텍스트 스타일 (미리 정의된 조합)
export const textStyle = {
  h1: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
  },
  h2: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
  },
  h3: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.h3,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
  },
  h4: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.h4,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
  },
  body1: {
    fontFamily: fontFamily.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.normal,
  },
  body2: {
    fontFamily: fontFamily.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.normal,
  },
  button: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.tight,
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
  caption: {
    fontFamily: fontFamily.secondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.normal,
  },
};
