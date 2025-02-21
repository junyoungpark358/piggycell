import { Input } from "antd";
import type { InputProps as AntInputProps } from "antd";
import type { SizeType } from "antd/es/config-provider/SizeContext";
import styled from "@emotion/styled";
import { css } from "@emotion/react";
import { useTheme } from "../../contexts/ThemeContext";
import { Size } from "./types";

type InputVariant = "default" | "filled" | "outlined";

interface CustomInputProps {
  customVariant?: InputVariant;
  customSize?: Size;
  fullWidth?: boolean;
  error?: boolean;
}

type StyledInputProps = Omit<AntInputProps, "size" | "variant"> &
  CustomInputProps;

const getInputStyles = ({
  customVariant = "default",
  customSize = "md",
  fullWidth = false,
  error = false,
  theme,
}: CustomInputProps & { theme: any }) => {
  const baseStyles = css`
    border-radius: ${theme.borderRadius.md};
    transition: all 0.3s ease;
    font-family: ${theme.typography.fontFamily.primary};
    ${fullWidth && "width: 100%;"}

    &:hover {
      border-color: ${theme.colors.border.hover};
    }

    &:focus {
      border-color: ${theme.colors.border.focus};
      box-shadow: 0 0 0 2px ${theme.colors.primary.light}1A;
    }

    ${error &&
    css`
      border-color: ${theme.colors.error.main} !important;
      &:hover,
      &:focus {
        border-color: ${theme.colors.error.dark} !important;
        box-shadow: 0 0 0 2px ${theme.colors.error.light}1A;
      }
    `}
  `;

  const sizeStyles = {
    xs: css`
      height: 28px;
      padding: ${theme.spacing.xs} ${theme.spacing.sm};
      font-size: ${theme.typography.fontSize.xs};
    `,
    sm: css`
      height: 32px;
      padding: ${theme.spacing.xs} ${theme.spacing.md};
      font-size: ${theme.typography.fontSize.sm};
    `,
    md: css`
      height: 40px;
      padding: ${theme.spacing.sm} ${theme.spacing.md};
      font-size: ${theme.typography.fontSize.md};
    `,
    lg: css`
      height: 48px;
      padding: ${theme.spacing.sm} ${theme.spacing.lg};
      font-size: ${theme.typography.fontSize.lg};
    `,
    xl: css`
      height: 56px;
      padding: ${theme.spacing.md} ${theme.spacing.xl};
      font-size: ${theme.typography.fontSize.xl};
    `,
  };

  const variantStyles = {
    default: css`
      background-color: ${theme.colors.background.paper};
      border: 1px solid ${theme.colors.border.default};
    `,
    filled: css`
      background-color: ${theme.colors.neutral.gray[50]};
      border: 1px solid transparent;

      &:hover {
        background-color: ${theme.colors.neutral.gray[100]};
      }

      &:focus {
        background-color: ${theme.colors.background.paper};
      }
    `,
    outlined: css`
      background-color: transparent;
      border: 2px solid ${theme.colors.border.default};

      &:hover {
        border-color: ${theme.colors.border.hover};
      }

      &:focus {
        border-color: ${theme.colors.border.focus};
      }
    `,
  };

  return css`
    ${baseStyles}
    ${sizeStyles[customSize]}
    ${variantStyles[customVariant]}
  `;
};

const StyledAntInput = styled(Input)<StyledInputProps & { theme: any }>`
  ${(props) => getInputStyles(props)}
`;

const sizeMap: Record<Size, SizeType> = {
  xs: "small",
  sm: "small",
  md: "middle",
  lg: "large",
  xl: "large",
};

export const StyledInput = ({
  customVariant = "default",
  customSize = "md",
  fullWidth = false,
  error = false,
  ...props
}: StyledInputProps) => {
  const { theme } = useTheme();

  return (
    <StyledAntInput
      customVariant={customVariant}
      customSize={customSize}
      fullWidth={fullWidth}
      error={error}
      size={sizeMap[customSize]}
      theme={theme}
      {...props}
    />
  );
};
