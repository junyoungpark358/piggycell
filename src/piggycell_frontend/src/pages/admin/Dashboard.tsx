import { Card, Row, Col, Statistic, Table, Input } from "antd";
import {
  ShoppingCartOutlined,
  BankOutlined,
  UserOutlined,
  LineChartOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import "./Dashboard.css";

const AdminDashboard = () => {
  // 임시 최근 거래 데이터
  const recentTransactions = [
    {
      key: "1",
      type: "NFT 판매",
      nftId: "충전 허브 #1",
      user: "0x1234...5678",
      amount: 100,
      date: "2024-02-12",
    },
    {
      key: "2",
      type: "스테이킹 보상",
      nftId: "충전 허브 #2",
      user: "0x8765...4321",
      amount: 5.5,
      date: "2024-02-12",
    },
  ];

  const columns = [
    {
      title: "거래 유형",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "NFT ID",
      dataIndex: "nftId",
      key: "nftId",
    },
    {
      title: "사용자",
      dataIndex: "user",
      key: "user",
    },
    {
      title: "금액",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number) => `${amount} ICP`,
    },
    {
      title: "날짜",
      dataIndex: "date",
      key: "date",
    },
  ];

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <h1 className="text-4xl font-bold mb-6">관리자 대시보드</h1>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="총 NFT 발행량"
              value={10}
              prefix={<ShoppingCartOutlined style={{ color: "#0284c7" }} />}
              suffix="개"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="스테이킹된 NFT"
              value={8}
              prefix={<BankOutlined style={{ color: "#0284c7" }} />}
              suffix="개"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="활성 사용자"
              value={25}
              prefix={<UserOutlined style={{ color: "#0284c7" }} />}
              suffix="명"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="총 거래액"
              value={1250.5}
              prefix={<LineChartOutlined style={{ color: "#0284c7" }} />}
              suffix="ICP"
            />
          </Card>
        </Col>
      </Row>

      <div className="search-box">
        <Input
          placeholder="거래 내역 검색..."
          prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
          size="middle"
        />
      </div>

      <Card className="table-card">
        <Table columns={columns} dataSource={recentTransactions} />
      </Card>
    </div>
  );
};

export default AdminDashboard;
