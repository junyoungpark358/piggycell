import { Button } from "antd";
import type { ButtonProps as AntButtonProps } from "antd";
import styled from "@emotion/styled";
import { css } from "@emotion/react";
import { useTheme } from "../../contexts/ThemeContext";
import { Size, Variant, Color } from "./types";

interface CustomButtonProps {
  customVariant?: Variant;
  customSize?: Size;
  customColor?: Color;
  fullWidth?: boolean;
}

type StyledButtonProps = Omit<AntButtonProps, "type" | "size"> &
  CustomButtonProps;

const getButtonStyles = ({
  customSize = "md",
  customVariant = "primary",
  customColor = "primary",
  fullWidth = false,
  theme,
}: CustomButtonProps & { theme: any }) => {
  const colorToken = theme.colors[customColor];

  const sizeStyles = {
    xs: css`
      font-size: ${theme.typography.fontSize.xs};
      padding: ${theme.spacing.xs} ${theme.spacing.sm};
    `,
    sm: css`
      font-size: ${theme.typography.fontSize.sm};
      padding: ${theme.spacing.xs} ${theme.spacing.md};
    `,
    md: css`
      font-size: ${theme.typography.fontSize.md};
      padding: ${theme.spacing.sm} ${theme.spacing.md};
    `,
    lg: css`
      font-size: ${theme.typography.fontSize.lg};
      padding: ${theme.spacing.sm} ${theme.spacing.lg};
    `,
    xl: css`
      font-size: ${theme.typography.fontSize.xl};
      padding: ${theme.spacing.md} ${theme.spacing.xl};
    `,
  };

  const variantStyles = {
    primary: css`
      background-color: ${colorToken.main} !important;
      color: #000000 !important;
      border: 3px solid #000 !important;
      box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.8) !important;
      transform: rotate(-1deg);
      font-family: "Bangers", cursive !important;
      letter-spacing: 1px;
      text-transform: uppercase;
      &:hover {
        transform: translateY(-3px) rotate(1deg) !important;
        box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.8) !important;
        background: linear-gradient(
          135deg,
          ${colorToken.main} 0%,
          ${colorToken.dark} 100%
        ) !important;
        color: #000000 !important;
      }
      &:active {
        transform: translate(1px, 1px) !important;
        box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.8) !important;
      }
    `,
    secondary: css`
      background-color: ${colorToken.light} !important;
      color: #000000 !important;
      border: 3px solid #000 !important;
      box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.8) !important;
      transform: rotate(-1deg);
      font-family: "Bangers", cursive !important;
      letter-spacing: 1px;
      text-transform: uppercase;
      &:hover {
        transform: translateY(-3px) rotate(1deg) !important;
        box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.8) !important;
        background: linear-gradient(
          135deg,
          ${colorToken.main} 0%,
          ${colorToken.dark} 100%
        ) !important;
        color: #000000 !important;
      }
      &:active {
        transform: translate(1px, 1px) !important;
        box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.8) !important;
      }
    `,
    outline: css`
      background-color: transparent !important;
      border: 3px solid ${colorToken.main} !important;
      color: ${colorToken.main} !important;
      box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.8) !important;
      transform: rotate(-1deg);
      font-family: "Bangers", cursive !important;
      letter-spacing: 1px;
      text-transform: uppercase;
      &:hover {
        transform: translateY(-3px) rotate(1deg) !important;
        box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.8) !important;
        background: linear-gradient(
          135deg,
          ${colorToken.main} 0%,
          ${colorToken.dark} 100%
        ) !important;
        color: ${theme.colors.neutral.white} !important;
      }
      &:active {
        transform: translate(1px, 1px) !important;
        box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.8) !important;
      }
    `,
    ghost: css`
      background-color: transparent !important;
      color: #000000 !important;
      border: 3px dashed ${colorToken.main} !important;
      box-shadow: none !important;
      transform: rotate(-1deg);
      font-family: "Bangers", cursive !important;
      letter-spacing: 1px;
      text-transform: uppercase;
      &:hover {
        transform: translateY(-3px) rotate(1deg) !important;
        background-color: ${colorToken.light}1A !important;
        border-style: solid !important;
        box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.8) !important;
        color: #000000 !important;
      }
      &:active {
        transform: translate(1px, 1px) !important;
        box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.8) !important;
      }
      &:disabled {
        opacity: 1 !important;
        cursor: not-allowed !important;
        background-color: #f3f4f6 !important;
        border-style: solid !important;
        border-color: #d1d5db !important;
        color: #000000 !important;
      }
    `,
  };

  return css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: ${theme.borderRadius.md};
    font-weight: ${theme.typography.fontWeight.medium};
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    overflow: visible;
    ${sizeStyles[customSize]}
    ${variantStyles[customVariant]}
    ${fullWidth && "width: 100%;"}

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    &::after {
      content: "";
      position: absolute;
      top: -2px;
      right: -2px;
      width: 10px;
      height: 10px;
      background: ${colorToken.main};
      border: 2px solid #000;
      border-radius: 50%;
      opacity: 0;
      transition: all 0.3s ease;
    }

    &:hover::after {
      opacity: 1;
      transform: scale(1.2) rotate(45deg);
    }

    &.ant-btn {
      &:focus {
        outline: none !important;
      }

      &.ant-btn-default {
        background: transparent !important;
      }
    }

    /* 모바일 환경에서 버튼 높이 일관성 유지 */
    @media (max-width: 768px) {
      height: 40px;
      padding-top: 4px;
      padding-bottom: 4px;
      font-size: ${theme.typography.fontSize.sm};
    }
  `;
};

const StyledAntButton = styled(Button)<StyledButtonProps & { theme: any }>`
  ${(props) => getButtonStyles(props)}
`;

const sizeMap: Record<Size, AntButtonProps["size"]> = {
  xs: "small",
  sm: "small",
  md: "middle",
  lg: "large",
  xl: "large",
};

export const StyledButton = ({
  children,
  customVariant = "primary",
  customSize = "md",
  customColor = "primary",
  fullWidth = false,
  ...props
}: StyledButtonProps) => {
  const { theme } = useTheme();

  return (
    <StyledAntButton
      size={sizeMap[customSize]}
      customVariant={customVariant}
      customSize={customSize}
      customColor={customColor}
      fullWidth={fullWidth}
      theme={theme}
      {...props}
    >
      {children}
    </StyledAntButton>
  );
};
