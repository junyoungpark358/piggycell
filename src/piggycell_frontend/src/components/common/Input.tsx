import { InputProps } from "./types";

export const Input = ({
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  size = "md",
  fullWidth = false,
  disabled = false,
  className = "",
}: InputProps) => {
  const baseStyles =
    "rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm transition-colors focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main";

  const sizeStyles = {
    xs: "px-2 py-1 text-xs",
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-4 py-2.5 text-lg",
    xl: "px-6 py-3 text-xl",
  };

  const classes = [
    baseStyles,
    sizeStyles[size],
    fullWidth ? "w-full" : "w-auto",
    disabled ? "cursor-not-allowed bg-gray-50 text-gray-500" : "",
    error ? "border-error focus:border-error focus:ring-error" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={fullWidth ? "w-full" : "w-auto"}>
      <input
        type={type}
        className={classes}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
      />
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
};
