import { ReactNode } from "react";

export type Size = "xs" | "sm" | "md" | "lg" | "xl";
export type Variant = "primary" | "secondary" | "outline" | "ghost";
export type Color =
  | "primary"
  | "secondary"
  | "success"
  | "error"
  | "warning"
  | "info";

export interface BaseProps {
  className?: string;
  children?: ReactNode;
}

export interface CardProps extends BaseProps {
  title?: string;
  subtitle?: string;
  elevation?: "none" | "sm" | "md" | "lg";
  padding?: Size;
  bordered?: boolean;
}

export interface ButtonProps extends BaseProps {
  variant?: Variant;
  size?: Size;
  color?: Color;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export interface TableProps extends BaseProps {
  headers: string[];
  rows: any[][];
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  bordered?: boolean;
}

export interface InputProps extends BaseProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  size?: Size;
  fullWidth?: boolean;
  disabled?: boolean;
}
