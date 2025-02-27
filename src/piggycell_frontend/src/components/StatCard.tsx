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
import { useTheme } from "../contexts/ThemeContext";

export type TrendType = "up" | "down" | "neutral";
export type IconType = "chart" | "user" | "token" | "wallet" | "none";

interface StatCardProps extends Omit<StatisticProps, "className"> {
  loading?: boolean;
  trend?: TrendType;
  iconType?: IconType;
  unit?: string;
}

const StyledStatistic = styled(Statistic)(
  ({ theme }) => `
  text-align: center;

  .ant-statistic-title {
    color: ${theme?.colors?.text?.secondary || "#666"};
    font-family: var(--font-display);
    font-size: ${theme?.typography?.fontSize?.md || "1rem"};
    font-weight: ${theme?.typography?.fontWeight?.medium || 500};
    margin-bottom: 0.5rem;
  }

  .ant-statistic-content {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }

  .ant-statistic-content-value {
    font-family: var(--font-primary);
    font-size: ${theme?.typography?.fontSize?.xl || "1.5rem"};
    font-weight: ${theme?.typography?.fontWeight?.bold || 700};
    color: ${theme?.colors?.primary?.main || "#1A73E8"};
  }

  .ant-statistic-content-suffix {
    font-family: var(--font-primary);
    font-size: ${theme?.typography?.fontSize?.md || "1rem"};
    font-weight: ${theme?.typography?.fontWeight?.medium || 500};
    color: ${theme?.colors?.text?.secondary || "#666"};
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
`
);

const SpinnerContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 3rem;
`;

const AnimatedCard = styled(StyledCard)`
  transition: transform 0.2s;
  &:hover {
    transform: none;
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
  loading = false,
  trend = "neutral",
  iconType = "none",
  unit,
  ...props
}) => {
  const { theme } = useTheme();
  const trendIcon = getTrendIcon(trend);
  const icon = getIconByType(iconType);

  const renderSuffix = () => {
    if (unit) {
      return (
        <>
          {icon}
          <span className="ant-statistic-content-suffix">{unit}</span>
        </>
      );
    }
    return props.suffix;
  };

  const renderPrefix = () => {
    if (icon) {
      return icon;
    }
    return trendIcon;
  };

  return (
    <StyledCard customVariant="stats">
      {loading ? (
        <div>
          <div className="ant-statistic-title">{props.title}</div>
          <SpinnerContainer>
            <Spin size="large" />
          </SpinnerContainer>
        </div>
      ) : (
        <StyledStatistic
          {...props}
          suffix={renderSuffix()}
          prefix={renderPrefix()}
        />
      )}
    </StyledCard>
  );
};

export type { StatCardProps };
