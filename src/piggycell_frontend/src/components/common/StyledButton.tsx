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
      color: ${theme.colors.neutral.white} !important;
      &:hover {
        background-color: ${colorToken.dark} !important;
      }
    `,
    secondary: css`
      background-color: ${colorToken.light} !important;
      color: ${colorToken.main} !important;
      &:hover {
        background-color: ${colorToken.main} !important;
        color: ${theme.colors.neutral.white} !important;
      }
    `,
    outline: css`
      background-color: transparent !important;
      border: 2px solid ${colorToken.main} !important;
      color: ${colorToken.main} !important;
      &:hover {
        background-color: ${colorToken.main} !important;
        color: ${theme.colors.neutral.white} !important;
      }
    `,
    ghost: css`
      background-color: transparent !important;
      color: ${colorToken.main} !important;
      &:hover {
        background-color: ${colorToken.light}1A !important;
      }
    `,
  };

  return css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: ${theme.borderRadius.md};
    font-weight: ${theme.typography.fontWeight.medium};
    transition: all 0.3s ease;
    ${sizeStyles[customSize]}
    ${variantStyles[customVariant]}
    ${fullWidth && "width: 100%;"}

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &.ant-btn {
      box-shadow: none !important;
      border: none !important;

      &:focus {
        outline: none !important;
        box-shadow: none !important;
      }

      &.ant-btn-default {
        background: transparent !important;
      }
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
