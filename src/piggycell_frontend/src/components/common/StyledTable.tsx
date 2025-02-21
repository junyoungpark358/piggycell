import { Table } from "antd";
import type { TableProps } from "antd";
import styled from "@emotion/styled";
import { css } from "@emotion/react";
import { useTheme } from "../../contexts/ThemeContext";
import { Size } from "./types";

export type TableVariant = "default" | "compact" | "bordered" | "striped";
export type TableSize = Exclude<Size, "xl">;

interface CustomTableProps {
  customVariant?: TableVariant;
  customSize?: TableSize;
  hoverable?: boolean;
  elevation?: "none" | "sm" | "md";
}

interface StyledTableProps<T extends object>
  extends TableProps<T>,
    CustomTableProps {}

const getTableStyles = ({
  customVariant = "default",
  customSize = "md",
  hoverable = true,
  elevation = "sm",
  theme,
}: CustomTableProps & { theme: any }) => {
  const sizeStyles = {
    xs: css`
      .ant-table-thead > tr > th,
      .ant-table-tbody > tr > td {
        padding: ${theme.spacing.xs} ${theme.spacing.sm};
        font-size: ${theme.typography.fontSize.sm};
      }
    `,
    sm: css`
      .ant-table-thead > tr > th,
      .ant-table-tbody > tr > td {
        padding: ${theme.spacing.sm};
        font-size: ${theme.typography.fontSize.md};
      }
    `,
    md: css`
      .ant-table-thead > tr > th,
      .ant-table-tbody > tr > td {
        padding: ${theme.spacing.sm} ${theme.spacing.md};
        font-size: ${theme.typography.fontSize.lg};
      }
    `,
    lg: css`
      .ant-table-thead > tr > th,
      .ant-table-tbody > tr > td {
        padding: ${theme.spacing.md};
        font-size: ${theme.typography.fontSize.xl};
      }
    `,
  };

  const baseStyles = css`
    .ant-table {
      background: ${theme.colors.background.paper};
      border-radius: ${theme.borderRadius.lg};
      border: 3px solid #000;
      box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.8);
      font-family: "Comic Neue", cursive;
      transform: none;
      overflow: hidden;
      position: relative;
    }

    .ant-table-thead > tr > th {
      background: linear-gradient(
        135deg,
        ${theme.colors.primary.main} 0%,
        ${theme.colors.secondary.main} 100%
      );
      color: #fff;
      font-family: "Bangers", cursive;
      font-weight: normal;
      letter-spacing: 1px;
      text-transform: uppercase;
      border-bottom: 3px solid #000;
      text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
      position: relative;
      overflow: visible;

      &::after {
        content: "";
        position: absolute;
        bottom: -3px;
        left: 0;
        width: 100%;
        height: 3px;
        background: repeating-linear-gradient(
          45deg,
          #000,
          #000 10px,
          ${theme.colors.primary.main} 10px,
          ${theme.colors.primary.main} 20px
        );
      }
    }

    .ant-table-tbody > tr > td {
      color: ${theme.colors.text.primary};
      border-bottom: 2px solid #000;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
    }

    ${hoverable &&
    css`
      .ant-table-tbody > tr:hover > td {
        background: ${theme.colors.primary.light}1A;
        transform: translateX(5px);
        &::before {
          content: "→";
          position: absolute;
          left: -20px;
          color: ${theme.colors.primary.main};
          font-family: "Bangers", cursive;
          font-size: 1.2em;
        }
      }
    `}

    .ant-table-pagination {
      margin: ${theme.spacing.md} 0;
      font-family: "Comic Neue", cursive;

      .ant-pagination-item {
        border: 2px solid #000;
        border-radius: ${theme.borderRadius.md};
        font-family: "Bangers", cursive;
        transform: rotate(-2deg);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);

        &:hover {
          transform: translateY(-2px) rotate(2deg);
          border-color: ${theme.colors.primary.main};
        }

        &-active {
          background: ${theme.colors.primary.main};
          border-color: #000;
          color: #fff;
          transform: rotate(2deg);
          box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.8);

          a {
            color: #fff;
          }
        }
      }

      .ant-pagination-prev,
      .ant-pagination-next {
        .ant-pagination-item-link {
          border: 2px solid #000;
          border-radius: ${theme.borderRadius.md};
          font-family: "Bangers", cursive;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);

          &:hover {
            transform: scale(1.1);
            border-color: ${theme.colors.primary.main};
          }
        }
      }
    }
  `;

  const variantStyles = {
    compact: css`
      ${sizeStyles.sm}
      .ant-table {
        transform: none;
      }
    `,
    bordered: css`
      .ant-table {
        border: 3px solid #000;
      }

      .ant-table-thead > tr > th,
      .ant-table-tbody > tr > td {
        border-right: 2px solid #000;
      }
    `,
    striped: css`
      .ant-table-tbody > tr:nth-of-type(odd) > td {
        background: repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(0, 0, 0, 0.02) 10px,
          rgba(0, 0, 0, 0.02) 20px
        );
      }

      .ant-table-tbody > tr:hover > td {
        background: ${theme.colors.primary.light}1A !important;
      }
    `,
    default: css`
      ${sizeStyles[customSize]}
    `,
  };

  return css`
    ${baseStyles}
    ${variantStyles[customVariant]}
  `;
};

const StyledAntTable = styled(Table)<StyledTableProps<any> & { theme: any }>`
  ${(props) => getTableStyles(props)}
` as <T extends object>(
  props: StyledTableProps<T> & { theme: any }
) => React.ReactElement;

export function StyledTable<T extends object>({
  customVariant = "default",
  customSize = "md",
  hoverable = true,
  elevation = "sm",
  ...props
}: StyledTableProps<T>) {
  const { theme } = useTheme();

  return (
    <StyledAntTable
      customVariant={customVariant}
      customSize={customSize}
      hoverable={hoverable}
      elevation={elevation}
      theme={theme}
      {...props}
    />
  );
}
