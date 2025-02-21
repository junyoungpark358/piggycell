import { Card } from "antd";
import type { CardProps as AntCardProps } from "antd";
import styled from "@emotion/styled";
import { css } from "@emotion/react";
import { useTheme } from "../../contexts/ThemeContext";
import { Size } from "./types";

export type CardVariant = "nft" | "stats" | "data" | "default";
export type CardElevation = "none" | "sm" | "md" | "lg" | "xl";

interface CustomCardProps {
  customVariant?: CardVariant;
  customPadding?: Size;
  elevation?: CardElevation;
  bordered?: boolean;
  interactive?: boolean;
}

type StyledCardProps = Omit<AntCardProps, "size"> & CustomCardProps;

const getCardStyles = ({
  customVariant = "default",
  customPadding = "md",
  elevation = "sm",
  bordered = true,
  interactive = false,
  theme,
}: CustomCardProps & { theme: any }) => {
  const paddingStyles = {
    xs: theme.spacing.xs,
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
    xl: theme.spacing.xl,
  };

  const elevationStyles = {
    none: "none",
    sm: theme.shadows.sm,
    md: theme.shadows.md,
    lg: theme.shadows.lg,
    xl: theme.shadows.xl,
  };

  const baseStyles = css`
    border-radius: ${theme.borderRadius.lg};
    box-shadow: ${elevationStyles[elevation]};
    transition: all 0.3s ease;
    border: ${bordered ? `1px solid ${theme.colors.border.default}` : "none"};
    background: ${theme.colors.background.card};

    .ant-card-body {
      padding: ${paddingStyles[customPadding]};
    }

    ${interactive &&
    css`
      cursor: pointer;
      &:hover {
        transform: translateY(-4px);
        box-shadow: ${theme.shadows.lg};
      }
    `}
  `;

  const variantStyles = {
    nft: css`
      overflow: hidden;
      background: ${theme.colors.background.paper};
      &:hover {
        box-shadow: ${theme.shadows.lg};
      }
    `,
    stats: css`
      background: linear-gradient(
        135deg,
        ${theme.colors.background.paper} 0%,
        ${theme.colors.neutral.gray[50]} 100%
      );
      border: 1px solid ${theme.colors.neutral.gray[200]};
      &:hover {
        box-shadow: ${theme.shadows.md};
      }
    `,
    data: css`
      background: ${theme.colors.background.card};
      backdrop-filter: blur(10px);
      border: 1px solid ${theme.colors.neutral.gray[200]};
    `,
    default: css`
      background: ${theme.colors.background.paper};
      &:hover {
        box-shadow: ${theme.shadows.sm};
      }
    `,
  };

  return css`
    ${baseStyles}
    ${variantStyles[customVariant]}
  `;
};

const StyledAntCard = styled(Card)<StyledCardProps & { theme: any }>`
  ${(props) => getCardStyles(props)}
`;

export const StyledCard = ({
  children,
  customVariant = "default",
  customPadding = "md",
  elevation = "sm",
  bordered = true,
  interactive = false,
  ...props
}: StyledCardProps) => {
  const { theme } = useTheme();

  return (
    <StyledAntCard
      customVariant={customVariant}
      customPadding={customPadding}
      elevation={elevation}
      bordered={bordered}
      interactive={interactive}
      theme={theme}
      {...props}
    >
      {children}
    </StyledAntCard>
  );
};
