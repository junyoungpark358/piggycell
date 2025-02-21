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

  const baseStyles = css`
    border-radius: ${theme.borderRadius.lg};
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    border: 3px solid #000;
    background: ${theme.colors.background.paper};
    transform: ${customVariant === "stats" ? "rotate(-1deg)" : "none"};
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.8);
    position: relative;
    overflow: visible;

    .ant-card-head {
      border-bottom: 3px solid #000;
      background: linear-gradient(
        135deg,
        ${theme.colors.primary.main} 0%,
        ${theme.colors.secondary.main} 100%
      );
      margin: -1px;
      border-radius: ${theme.borderRadius.lg} ${theme.borderRadius.lg} 0 0;

      .ant-card-head-title {
        font-family: "Bangers", cursive;
        font-size: 1.5rem;
        color: #fff;
        text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
        letter-spacing: 1px;
      }
    }

    .ant-card-body {
      padding: ${paddingStyles[customPadding]};
      font-family: "Comic Neue", cursive;
    }

    &::before {
      content: "";
      position: absolute;
      top: -10px;
      right: -10px;
      width: 30px;
      height: 30px;
      background: ${theme.colors.primary.main};
      border: 3px solid #000;
      border-radius: 50%;
      transform: rotate(15deg);
      z-index: 1;
    }

    &::after {
      content: "★";
      position: absolute;
      top: -5px;
      right: -5px;
      color: #fff;
      font-size: 1.2rem;
      z-index: 2;
      transform: rotate(-15deg);
    }

    ${interactive &&
    css`
      cursor: pointer;
      &:hover {
        transform: translateY(-5px) rotate(1deg);
        box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.8);
      }
    `}
  `;

  const variantStyles = {
    nft: css`
      background: ${theme.colors.background.paper};
      &::before {
        background: ${theme.colors.secondary.main};
      }
      &:hover {
        transform: translateY(-5px) rotate(1deg);
        box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.8);
      }
      .ant-card-cover {
        border-bottom: 3px solid #000;
        padding: 1rem;
        background: repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(0, 0, 0, 0.05) 10px,
          rgba(0, 0, 0, 0.05) 20px
        );
      }
    `,
    stats: css`
      background: linear-gradient(
        135deg,
        ${theme.colors.background.paper} 0%,
        ${theme.colors.primary.light} 100%
      );
      &::before {
        background: ${theme.colors.success.main};
      }
      .ant-statistic-title {
        font-family: "Bangers", cursive;
        color: ${theme.colors.text.primary};
        font-size: 1.2rem;
        letter-spacing: 1px;
        margin-bottom: 0.8rem;
        text-transform: uppercase;
      }
      .ant-statistic-content {
        font-family: "Comic Neue", cursive;
        color: ${theme.colors.primary.main};
        font-size: 2rem;
        font-weight: 700;
        text-shadow: 2px 2px 0 #000;
      }
    `,
    data: css`
      background: ${theme.colors.background.paper};
      &::before {
        background: ${theme.colors.info.main};
      }
      .ant-table {
        font-family: "Comic Neue", cursive;
      }
      .ant-table-thead > tr > th {
        font-family: "Bangers", cursive;
        background: linear-gradient(
          135deg,
          ${theme.colors.primary.main} 0%,
          ${theme.colors.secondary.main} 100%
        );
        color: #fff;
        text-transform: uppercase;
        letter-spacing: 1px;
        border-bottom: 3px solid #000;
      }
    `,
    default: css`
      background: ${theme.colors.background.paper};
      &:hover {
        transform: translateY(-5px) rotate(1deg);
        box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.8);
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
