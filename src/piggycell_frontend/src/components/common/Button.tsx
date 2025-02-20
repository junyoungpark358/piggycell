import { ButtonProps } from "./types";
import { colors } from "../../styles/theme/tokens";

export const Button = ({
  children,
  className = "",
  variant = "primary",
  size = "md",
  color = "primary",
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
}: ButtonProps) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const sizeStyles = {
    xs: "px-2.5 py-1.5 text-xs",
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
    xl: "px-8 py-4 text-xl",
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
    disabled ? "opacity-50 cursor-not-allowed" : "",
    loading ? "cursor-wait" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <span className="mr-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      ) : null}
      {children}
    </button>
  );
};
