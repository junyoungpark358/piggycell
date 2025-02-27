# PiggyCell Frontend

## 폰트 시스템 가이드

프로젝트에서는 일관된 사용자 경험을 위해 폰트 시스템을 통합하여 관리합니다.

### 폰트 패밀리

프로젝트에서는 3가지 폰트 패밀리를 목적에 맞게 사용합니다:

1. `--font-primary` (Pretendard): 기본 본문 텍스트와 대부분의 UI 요소에 사용
2. `--font-secondary` (Nunito): 부가적인 본문 텍스트와 보조 정보에 사용
3. `--font-display` (Bangers): 제목, 헤더, 버튼 등 강조가 필요한 요소에 사용

### 사용 방법

#### CSS 변수를 통한 사용 (CSS 파일)

CSS 파일에서는 다음과 같이 변수를 사용합니다:

```css
.my-element {
  font-family: var(--font-primary);
  font-size: 16px;
  font-weight: 500;
}
```

#### 테마 시스템을 통한 사용 (styled-components)

styled-component에서는 테마를 통해 폰트를 사용합니다:

```tsx
const MyStyledComponent = styled.div(
  ({ theme }) => `
  font-family: ${theme.typography.fontFamily.primary};
  font-size: ${theme.typography.fontSize.md};
  font-weight: ${theme.typography.fontWeight.medium};
`
);
```

### 폰트 관련 파일

폰트 시스템은 다음 파일들을 통해 관리됩니다:

- `src/styles/theme/typography.ts`: 폰트 속성 정의 (fontFamily, fontSize, fontWeight 등)
- `src/styles/theme/tokens.ts`: 테마 토큰에 폰트 통합
- `src/index.css`: 전역 CSS 변수로 폰트 정의

폰트를 변경하거나 추가해야 할 경우 위 파일들을 수정하세요.
