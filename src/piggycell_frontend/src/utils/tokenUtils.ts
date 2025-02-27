/**
 * 토큰 관련 유틸리티 함수들을 모아둔 파일입니다.
 */

const DECIMALS = 8;

/**
 * raw 단위의 토큰 값을 내부 처리용으로 반환합니다.
 * 이제 변환 없이 raw 값을 그대로 반환합니다.
 *
 * @param rawBalance - raw 단위의 토큰 값 (BigInt, number 또는 string)
 * @returns raw 단위의 값 (number로 변환)
 */
export const formatTokenDisplay = (
  rawBalance: number | bigint | string
): number => {
  return Number(rawBalance);
};

/**
 * raw 단위의 토큰 값을 UI 표시용 형식으로 변환합니다.
 * 예: 100000000 -> 1.00000000
 *
 * @param rawBalance - 변환할 raw 단위의 토큰 값 (BigInt, number 또는 string)
 * @returns 화면 표시용으로 변환된 숫자 값
 */
export const formatTokenDisplayForUI = (
  rawBalance: number | bigint | string
): number => {
  const balance = Number(rawBalance);
  return balance / Math.pow(10, DECIMALS);
};

/**
 * 화면 표시용 토큰 값을 raw 단위로 변환합니다.
 * 예: 1.00000000 -> 100000000
 *
 * @param displayBalance - 변환할 화면 표시용 토큰 값
 * @returns raw 단위로 변환된 값
 */
export const parseTokenToRaw = (displayBalance: number): bigint => {
  return BigInt(Math.round(displayBalance * Math.pow(10, DECIMALS)));
};

/**
 * raw 단위의 토큰 값을 화면에 표시할 문자열로 포맷팅합니다.
 * 지수 표기법(1e-8) 대신 일반 소수점 표기법(0.00000001)을 사용합니다.
 *
 * @param rawBalance - 변환할 raw 단위의 토큰 값 (BigInt, number 또는 string)
 * @param decimalPlaces - 표시할 소수점 자릿수 (기본값: 8)
 * @returns 포맷팅된 문자열
 */
export const formatTokenString = (
  rawBalance: number | bigint | string,
  decimalPlaces: number = DECIMALS
): string => {
  // toFixed()는 때때로 지수 표기법을 사용할 수 있으므로,
  // Number.prototype.toLocaleString()를 사용하여 강제로 소수점 표기법을 사용합니다.
  const balance = formatTokenDisplayForUI(rawBalance);

  // 소수점 표기법 강제 적용
  return balance.toLocaleString("fullwide", {
    useGrouping: false,
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
};

/**
 * 간단한 PGC 잔액 표시 유틸리티 함수 - toFixed를 사용하고 싶을 때 사용
 * 매우 작은 값의 경우에도 지수 표기법을 사용하지 않도록 합니다.
 *
 * @param balance - 토큰 잔액 (raw 단위)
 * @param decimals - 표시할 소수점 자릿수
 * @returns 포맷팅된 문자열
 */
export const formatPGCBalance = (
  balance: number | bigint | string,
  decimals: number = DECIMALS
): string => {
  const num = Number(balance) / Math.pow(10, DECIMALS);

  // 숫자가 0에 가까운 경우 (예: 1e-8) 특별 처리
  if (num < 1e-7 && num > 0) {
    // 소수점 형식으로 강제 변환
    return num.toLocaleString("fullwide", {
      useGrouping: false,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return num.toFixed(decimals);
};
