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
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    font-family: ${theme.typography.fontFamily.primary};
    transform: rotate(-1deg);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.8);
    ${fullWidth && "width: 100%;"}

    &:hover {
      transform: translateY(-2px) rotate(1deg);
      box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.8);
    }

    &:focus {
      transform: translateY(-2px) rotate(0deg);
      box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.8);
      border-color: ${theme.colors.primary.main};
      outline: none;
    }

    ${error &&
    css`
      border-color: ${theme.colors.error.main} !important;
      &::before {
        content: "!";
        position: absolute;
        top: -10px;
        right: -10px;
        width: 20px;
        height: 20px;
        background: ${theme.colors.error.main};
        color: white;
        border: 2px solid #000;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: ${theme.typography.fontFamily.display};
        font-size: 14px;
        transform: rotate(15deg);
      }
      &:hover,
      &:focus {
        border-color: ${theme.colors.error.dark} !important;
      }
    `}
  `;

  const sizeStyles = {
    xs: css`
      height: 32px;
      padding: ${theme.spacing.xs} ${theme.spacing.sm};
      font-size: ${theme.typography.fontSize.md};
    `,
    sm: css`
      height: 36px;
      padding: ${theme.spacing.xs} ${theme.spacing.md};
      font-size: ${theme.typography.fontSize.md};
    `,
    md: css`
      height: 44px;
      padding: ${theme.spacing.sm} ${theme.spacing.md};
      font-size: ${theme.typography.fontSize.lg};
    `,
    lg: css`
      height: 52px;
      padding: ${theme.spacing.sm} ${theme.spacing.lg};
      font-size: ${theme.typography.fontSize.xl};
    `,
    xl: css`
      height: 60px;
      padding: ${theme.spacing.md} ${theme.spacing.xl};
      font-size: ${theme.typography.fontSize.xxl};
    `,
  };

  const variantStyles = {
    default: css`
      background-color: ${theme.colors.background.paper};
      border: 3px solid #000;
    `,
    filled: css`
      background-color: ${theme.colors.neutral.gray[50]};
      border: 3px solid #000;
      position: relative;
      overflow: visible;

      &::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(0, 0, 0, 0.05) 10px,
          rgba(0, 0, 0, 0.05) 20px
        );
      }

      &:hover {
        background-color: ${theme.colors.neutral.gray[100]};
      }

      &:focus {
        background-color: ${theme.colors.background.paper};
      }
    `,
    outlined: css`
      background-color: transparent;
      border: 3px solid #000;
      border-style: dashed;

      &:hover {
        border-style: solid;
      }

      &:focus {
        border-style: solid;
        border-color: ${theme.colors.primary.main};
      }
    `,
  };

  return css`
    ${baseStyles}
    ${sizeStyles[customSize]}
    ${variantStyles[customVariant]}
    position: relative;

    &::placeholder {
      color: ${theme.colors.text.secondary};
      font-style: italic;
    }

    &.ant-input-affix-wrapper {
      padding: 0 ${theme.spacing.md};

      .ant-input-prefix,
      .ant-input-suffix {
        font-size: 1.2em;
        color: ${theme.colors.text.secondary};
      }

      .ant-input {
        font-family: ${theme.typography.fontFamily.primary};
        background: transparent;
      }
    }
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
