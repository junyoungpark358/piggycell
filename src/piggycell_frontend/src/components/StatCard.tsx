import { Statistic, Spin } from "antd";
import type { StatisticProps } from "antd";
import { StyledCard } from "./common/StyledCard";
import styled from "@emotion/styled";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  LineChartOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";

export type TrendType = "up" | "down" | "neutral";
export type IconType = "chart" | "user" | "token" | "wallet" | "none";

interface StatCardProps extends Omit<StatisticProps, "className"> {
  loading?: boolean;
  trend?: TrendType;
  iconType?: IconType;
  unit?: string;
}

const StyledStatistic = styled(Statistic)`
  text-align: center;

  .ant-statistic-title {
    color: #4b5563;
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .ant-statistic-content {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }

  .ant-statistic-content-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: #0284c7;
  }

  .ant-statistic-content-suffix {
    font-size: 1rem;
    font-weight: 500;
    color: #4b5563;
    margin-left: 0.25rem;
  }

  .anticon {
    font-size: 1.25rem;
    color: #0284c7;
    margin-right: 0.5rem;
  }

  .trend-up {
    color: #10b981;
  }

  .trend-down {
    color: #ef4444;
  }

  .trend-neutral {
    color: #6366f1;
  }
`;

const SpinnerContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 3rem;
`;

const AnimatedCard = styled(StyledCard)`
  transition: transform 0.2s;
  &:hover {
    transform: translateY(-0.25rem);
  }
`;

const getIconByType = (iconType: IconType) => {
  switch (iconType) {
    case "chart":
      return <LineChartOutlined />;
    case "user":
      return <UserOutlined />;
    case "token":
    case "wallet":
      return <WalletOutlined />;
    case "none":
    default:
      return null;
  }
};

const getTrendIcon = (trend: TrendType) => {
  switch (trend) {
    case "up":
      return <ArrowUpOutlined className="trend-up" />;
    case "down":
      return <ArrowDownOutlined className="trend-down" />;
    case "neutral":
    default:
      return null;
  }
};

export const StatCard: React.FC<StatCardProps> = ({
  loading,
  trend = "neutral",
  iconType = "none",
  unit,
  ...props
}) => {
  const trendIcon = getTrendIcon(trend);
  const icon = getIconByType(iconType);

  return (
    <AnimatedCard customVariant="stats">
      {loading ? (
        <div>
          <div className="ant-statistic-title">{props.title}</div>
          <SpinnerContainer>
            <Spin size="small" />
          </SpinnerContainer>
        </div>
      ) : (
        <StyledStatistic
          {...props}
          prefix={icon}
          suffix={unit || props.suffix}
        />
      )}
    </AnimatedCard>
  );
};

export type { StatCardProps };
