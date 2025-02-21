import { Button as AntButton } from "antd";
import type { ButtonProps as AntButtonProps } from "antd";
import type { SizeType } from "antd/es/config-provider/SizeContext";
import { ButtonProps } from "./types";
import { colors } from "../../styles/theme/tokens";

export const StyledButton = ({
  children,
  className = "",
  variant = "primary",
  size = "md",
  color = "primary",
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  ...props
}: ButtonProps & Omit<AntButtonProps, keyof ButtonProps>) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors";

  const sizeStyles = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };

  const variantStyles = {
    primary: `bg-${color}-main hover:bg-${color}-dark text-white`,
    secondary: `bg-${color}-light hover:bg-${color}-main text-white`,
    outline: `border-2 border-${color}-main text-${color}-main hover:bg-${color}-main hover:text-white`,
    ghost: `text-${color}-main hover:bg-${color}-light/10`,
  };

  const classes = [
    baseStyles,
    sizeStyles[size],
    variantStyles[variant],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const sizeMap: Record<string, SizeType> = {
    xs: "small",
    sm: "small",
    md: "middle",
    lg: "large",
    xl: "large",
  };

  return (
    <AntButton
      className={classes}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
      size={sizeMap[size]}
      {...props}
    >
      {children}
    </AntButton>
  );
};
