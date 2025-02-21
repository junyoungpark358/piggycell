import { Row, Col, Input, message } from "antd";
import {
  LineChartOutlined,
  RiseOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import "./Revenue.css";
import { StatCard } from "../../components/StatCard";
import { StyledTable } from "../../components/common/StyledTable";
import { StyledButton } from "../../components/common/StyledButton";

const AdminRevenue = () => {
  // 임시 수익 데이터
  const revenueData = [
    {
      key: "1",
      date: "2024-02-12",
      totalRevenue: 150.5,
      nftCount: 8,
      activeUsers: 25,
      stakingRewards: 12.5,
    },
    {
      key: "2",
      date: "2024-02-11",
      totalRevenue: 120.8,
      nftCount: 8,
      activeUsers: 22,
      stakingRewards: 10.2,
    },
  ];

  const columns = [
    {
      title: "날짜",
      dataIndex: "date",
      key: "date",
    },
    {
      title: "총 수익",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      render: (value: number) => `${value} PGC`,
    },
    {
      title: "활성 NFT 수",
      dataIndex: "nftCount",
      key: "nftCount",
      render: (value: number) => `${value}개`,
    },
    {
      title: "활성 사용자 수",
      dataIndex: "activeUsers",
      key: "activeUsers",
      render: (value: number) => `${value}명`,
    },
    {
      title: "스테이킹 보상",
      dataIndex: "stakingRewards",
      key: "stakingRewards",
      render: (value: number) => `${value} PGC`,
    },
  ];

  const handleRefresh = () => {
    // Implementation of handleRefresh function
  };

  return (
    <div className="revenue-management">
      <div className="page-header">
        <h1 className="mb-6 text-4xl font-bold">수익 관리</h1>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={8} md={8}>
          <StatCard
            title="이번 달 총 수익"
            value={271.3}
            prefix={<LineChartOutlined />}
            suffix="PGC"
          />
        </Col>
        <Col xs={12} sm={8} md={8}>
          <StatCard
            title="전월 대비"
            value={12.5}
            prefix={<RiseOutlined />}
            suffix="%"
            valueStyle={{ color: "#3f8600" }}
          />
        </Col>
        <Col xs={12} sm={8} md={8}>
          <StatCard
            title="스테이킹 보상 지급액"
            value={22.7}
            prefix={<LineChartOutlined />}
            suffix="PGC"
          />
        </Col>
      </Row>

      <div className="search-box">
        <Input
          placeholder="수익 내역 검색..."
          prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
          size="middle"
        />
      </div>

      <div className="flex justify-end mb-4">
        <StyledButton variant="primary" color="primary" onClick={handleRefresh}>
          새로고침
        </StyledButton>
      </div>

      <StyledTable
        columns={columns}
        dataSource={revenueData}
        styleVariant="default"
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default AdminRevenue;
