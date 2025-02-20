import { Statistic } from "antd";
import type { StatisticProps } from "antd";
import { StyledCard } from "./common/StyledCard";

interface StatCardProps extends Omit<StatisticProps, "className"> {
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ loading, ...props }) => {
  const statisticStyles = [
    // 기본 스타일
    "text-center",
    // 타이틀 스타일
    "[&_.ant-statistic-title]:text-gray-600",
    "[&_.ant-statistic-title]:text-base",
    "[&_.ant-statistic-title]:font-medium",
    "[&_.ant-statistic-title]:mb-2",
    // 컨텐츠 스타일
    "[&_.ant-statistic-content]:inline-flex",
    "[&_.ant-statistic-content]:items-center",
    "[&_.ant-statistic-content]:justify-center",
    "[&_.ant-statistic-content]:gap-1",
    // 값 스타일
    "[&_.ant-statistic-content-value]:text-2xl",
    "[&_.ant-statistic-content-value]:font-semibold",
    "[&_.ant-statistic-content-value]:text-sky-600",
    // 접미사 스타일
    "[&_.ant-statistic-content-suffix]:text-base",
    "[&_.ant-statistic-content-suffix]:font-medium",
    "[&_.ant-statistic-content-suffix]:text-gray-600",
    "[&_.ant-statistic-content-suffix]:ml-1",
    // 아이콘 스타일
    "[&_.anticon]:text-xl",
    "[&_.anticon]:text-sky-600",
    "[&_.anticon]:mr-2",
  ].join(" ");

  return (
    <StyledCard
      styleVariant="stats"
      className="hover:-translate-y-1 transition-transform"
    >
      <Statistic className={statisticStyles} loading={loading} {...props} />
    </StyledCard>
  );
};
