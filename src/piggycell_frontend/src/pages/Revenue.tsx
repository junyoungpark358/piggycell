import { Card, Row, Col, Statistic } from "antd";
import {
  LineChartOutlined,
  RiseOutlined,
  CalendarOutlined,
  TrophyOutlined,
} from "@ant-design/icons";

const Revenue = () => {
  // 임시 수익 데이터
  const revenueData = [
    {
      id: 1,
      name: "충전 허브 #1",
      dailyRevenue: 2.5,
      weeklyRevenue: 17.5,
      monthlyRevenue: 75.0,
      status: "active",
      chargerCount: 8,
    },
    {
      id: 2,
      name: "충전 허브 #2",
      dailyRevenue: 3.0,
      weeklyRevenue: 21.0,
      monthlyRevenue: 90.0,
      status: "active",
      chargerCount: 6,
    },
    {
      id: 3,
      name: "충전 허브 #3",
      dailyRevenue: 0,
      weeklyRevenue: 8.4,
      monthlyRevenue: 36.0,
      status: "inactive",
      chargerCount: 4,
    },
  ];

  const totalDaily = revenueData.reduce(
    (sum, item) => sum + item.dailyRevenue,
    0
  );
  const totalWeekly = revenueData.reduce(
    (sum, item) => sum + item.weeklyRevenue,
    0
  );
  const totalMonthly = revenueData.reduce(
    (sum, item) => sum + item.monthlyRevenue,
    0
  );

  return (
    <div className="nft-market">
      <h1>수익 현황</h1>

      {/* 전체 수익 통계 */}
      <Row gutter={[24, 24]} className="mb-8">
        <Col xs={24} md={8}>
          <Card hoverable className="nft-card">
            <Statistic
              title="일일 수익"
              value={totalDaily}
              precision={2}
              prefix={<LineChartOutlined className="text-[#38bdf8]" />}
              suffix="ICP"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable className="nft-card">
            <Statistic
              title="주간 수익"
              value={totalWeekly}
              precision={2}
              prefix={<RiseOutlined className="text-[#0ea5e9]" />}
              suffix="ICP"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable className="nft-card">
            <Statistic
              title="월간 수익"
              value={totalMonthly}
              precision={2}
              prefix={<TrophyOutlined className="text-[#0284c7]" />}
              suffix="ICP"
            />
          </Card>
        </Col>
      </Row>

      {/* NFT별 수익 현황 */}
      <h2 className="text-xl font-bold mb-6">NFT별 수익 현황</h2>
      <Row gutter={[24, 24]}>
        {revenueData.map((item) => (
          <Col key={item.id} xs={24} sm={12} md={8}>
            <Card
              className="nft-card"
              title={item.name}
              cover={
                <div className="h-48 bg-[rgba(56,189,248,0.1)] flex items-center justify-center text-[#38bdf8]">
                  <CalendarOutlined style={{ fontSize: "48px" }} />
                </div>
              }
            >
              <div className="nft-status available">
                {item.status === "active" ? "운영중" : "운영중지"}
              </div>
              <div className="nft-info">
                <div className="label">충전기 수</div>
                <div className="value">{item.chargerCount}대</div>
              </div>
              <div className="nft-info">
                <div className="label">일일 수익</div>
                <div className="value">{item.dailyRevenue.toFixed(2)} ICP</div>
              </div>
              <div className="nft-info">
                <div className="label">주간 수익</div>
                <div className="value">{item.weeklyRevenue.toFixed(2)} ICP</div>
              </div>
              <div className="nft-info">
                <div className="label">월간 수익</div>
                <div className="value">
                  {item.monthlyRevenue.toFixed(2)} ICP
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Revenue;
