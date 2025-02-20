import { Table } from "antd";
import type { TableProps } from "antd";
import { StyledCard } from "./StyledCard";

interface StyledTableProps<T> extends TableProps<T> {
  styleVariant?: "default" | "compact" | "bordered";
}

export const StyledTable = <T extends object>({
  styleVariant = "default",
  className,
  ...props
}: StyledTableProps<T>) => {
  // 기본 스타일
  const baseStyles = "w-full";

  // 변형별 스타일
  const variantStyles = {
    default: "table-default",
    compact: "table-compact",
    bordered: "table-bordered",
  };

  return (
    <StyledCard styleVariant="data">
      <Table
        className={`${baseStyles} ${variantStyles[styleVariant]} ${
          className || ""
        }`}
        {...props}
      />
    </StyledCard>
  );
};
