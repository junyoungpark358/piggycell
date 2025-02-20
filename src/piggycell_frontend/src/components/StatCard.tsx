import { Statistic } from "antd";
import type { StatisticProps } from "antd";
import { StyledCard } from "./common/StyledCard";

interface StatCardProps extends Omit<StatisticProps, "className"> {
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ loading, ...props }) => {
  return (
    <StyledCard styleVariant="stats">
      <Statistic loading={loading} {...props} />
    </StyledCard>
  );
};
