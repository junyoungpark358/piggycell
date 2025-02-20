import { Card } from "antd";
import type { CardProps } from "antd";

export type CardStyleVariant = "nft" | "stats" | "data" | "default";

interface StyledCardProps extends Omit<CardProps, "variant"> {
  styleVariant?: CardStyleVariant;
}

export const StyledCard: React.FC<StyledCardProps> = ({
  children,
  styleVariant = "default",
  className,
  ...props
}) => {
  // 기본 스타일
  const baseStyles = "bg-white rounded-xl transition-all";

  // 변형별 스타일
  const variantStyles = {
    nft: "shadow-sm hover:shadow-md p-4",
    stats: "shadow-sm p-5",
    data: "shadow-sm p-6",
    default: "shadow-sm p-4",
  };

  return (
    <Card
      bordered={false}
      className={`${baseStyles} ${variantStyles[styleVariant]} ${
        className || ""
      }`}
      {...props}
    >
      {children}
    </Card>
  );
};
