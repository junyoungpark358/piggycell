import { Table, Card, Row, Col, Statistic, Input } from "antd";
import {
  LineChartOutlined,
  RiseOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import "./Revenue.css";

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

  return (
    <div className="revenue-management">
      <div className="page-header">
        <h1 className="text-4xl font-bold mb-6">수익 관리</h1>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={8} md={8}>
          <Card>
            <Statistic
              title="이번 달 총 수익"
              value={271.3}
              prefix={<LineChartOutlined style={{ color: "#0284c7" }} />}
              suffix="PGC"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={8}>
          <Card>
            <Statistic
              title="전월 대비"
              value={12.5}
              prefix={<RiseOutlined style={{ color: "#0284c7" }} />}
              suffix="%"
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={8}>
          <Card>
            <Statistic
              title="스테이킹 보상 지급액"
              value={22.7}
              prefix={<LineChartOutlined style={{ color: "#0284c7" }} />}
              suffix="PGC"
            />
          </Card>
        </Col>
      </Row>

      <div className="search-box">
        <Input
          placeholder="수익 내역 검색..."
          prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
          size="middle"
        />
      </div>

      <Card className="table-card">
        <Table columns={columns} dataSource={revenueData} />
      </Card>
    </div>
  );
};

export default AdminRevenue;
