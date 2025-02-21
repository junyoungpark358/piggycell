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
        font-size: ${theme.typography.fontSize.xs};
      }
    `,
    sm: css`
      .ant-table-thead > tr > th,
      .ant-table-tbody > tr > td {
        padding: ${theme.spacing.sm};
        font-size: ${theme.typography.fontSize.sm};
      }
    `,
    md: css`
      .ant-table-thead > tr > th,
      .ant-table-tbody > tr > td {
        padding: ${theme.spacing.sm} ${theme.spacing.md};
        font-size: ${theme.typography.fontSize.md};
      }
    `,
    lg: css`
      .ant-table-thead > tr > th,
      .ant-table-tbody > tr > td {
        padding: ${theme.spacing.md};
        font-size: ${theme.typography.fontSize.lg};
      }
    `,
  };

  const elevationStyles = {
    none: "none",
    sm: theme.shadows.sm,
    md: theme.shadows.md,
  };

  const baseStyles = css`
    .ant-table {
      background: ${theme.colors.background.paper};
      border-radius: ${theme.borderRadius.lg};
      box-shadow: ${elevationStyles[elevation]};
      font-family: ${theme.typography.fontFamily.primary};
    }

    .ant-table-thead > tr > th {
      background: ${theme.colors.neutral.gray[50]};
      color: ${theme.colors.text.primary};
      font-weight: ${theme.typography.fontWeight.semibold};
      border-bottom: 2px solid ${theme.colors.border.default};
    }

    .ant-table-tbody > tr > td {
      color: ${theme.colors.text.secondary};
      border-bottom: 1px solid ${theme.colors.border.default};
    }

    ${hoverable &&
    css`
      .ant-table-tbody > tr:hover > td {
        background: ${theme.colors.neutral.gray[50]};
      }
    `}

    .ant-table-pagination {
      margin: ${theme.spacing.md} 0;
    }
  `;

  const variantStyles = {
    compact: css`
      ${sizeStyles.sm}
    `,
    bordered: css`
      .ant-table {
        border: 1px solid ${theme.colors.border.default};
      }

      .ant-table-thead > tr > th,
      .ant-table-tbody > tr > td {
        border-right: 1px solid ${theme.colors.border.default};
      }
    `,
    striped: css`
      .ant-table-tbody > tr:nth-of-type(odd) > td {
        background: ${theme.colors.neutral.gray[50]};
      }

      .ant-table-tbody > tr:hover > td {
        background: ${theme.colors.neutral.gray[100]} !important;
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
