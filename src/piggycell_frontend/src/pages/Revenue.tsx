import { Card, Row, Col, Button, Input, Statistic } from "antd";
import {
  SearchOutlined,
  DollarOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import "./Revenue.css";

const Revenue = () => {
  // 임시 수익 데이터
  const revenueData = [
    {
      id: 1,
      name: "강남 충전 허브 #1",
      dailyRevenue: 25.5,
      monthlyRevenue: 765,
      totalRevenue: 2550,
      usageCount: 450,
      status: "active",
      chargerCount: 8,
      utilization: 85,
    },
    {
      id: 2,
      name: "서초 충전 허브 #1",
      dailyRevenue: 18.2,
      monthlyRevenue: 546,
      totalRevenue: 1820,
      usageCount: 320,
      status: "active",
      chargerCount: 6,
      utilization: 78,
    },
    {
      id: 3,
      name: "송파 충전 허브 #1",
      dailyRevenue: 32.8,
      monthlyRevenue: 984,
      totalRevenue: 3280,
      usageCount: 580,
      status: "active",
      chargerCount: 10,
      utilization: 92,
    },
    {
      id: 4,
      name: "강남 충전 허브 #2",
      dailyRevenue: 15.5,
      monthlyRevenue: 465,
      totalRevenue: 1550,
      usageCount: 280,
      status: "maintenance",
      chargerCount: 6,
      utilization: 0,
    },
    {
      id: 5,
      name: "성동 충전 허브 #1",
      dailyRevenue: 28.4,
      monthlyRevenue: 852,
      totalRevenue: 2840,
      usageCount: 510,
      status: "active",
      chargerCount: 8,
      utilization: 88,
    },
    {
      id: 6,
      name: "마포 충전 허브 #1",
      dailyRevenue: 22.6,
      monthlyRevenue: 678,
      totalRevenue: 2260,
      usageCount: 420,
      status: "active",
      chargerCount: 7,
      utilization: 82,
    },
    {
      id: 7,
      name: "영등포 충전 허브 #1",
      dailyRevenue: 20.8,
      monthlyRevenue: 624,
      totalRevenue: 2080,
      usageCount: 380,
      status: "active",
      chargerCount: 6,
      utilization: 75,
    },
    {
      id: 8,
      name: "강서 충전 허브 #1",
      dailyRevenue: 16.2,
      monthlyRevenue: 486,
      totalRevenue: 1620,
      usageCount: 290,
      status: "maintenance",
      chargerCount: 5,
      utilization: 0,
    },
    {
      id: 9,
      name: "용산 충전 허브 #1",
      dailyRevenue: 24.5,
      monthlyRevenue: 735,
      totalRevenue: 2450,
      usageCount: 440,
      status: "active",
      chargerCount: 7,
      utilization: 86,
    },
    {
      id: 10,
      name: "서초 충전 허브 #2",
      dailyRevenue: 30.2,
      monthlyRevenue: 906,
      totalRevenue: 3020,
      usageCount: 540,
      status: "active",
      chargerCount: 9,
      utilization: 90,
    },
    {
      id: 11,
      name: "강동 충전 허브 #1",
      dailyRevenue: 17.8,
      monthlyRevenue: 534,
      totalRevenue: 1780,
      usageCount: 320,
      status: "active",
      chargerCount: 5,
      utilization: 80,
    },
    {
      id: 12,
      name: "송파 충전 허브 #2",
      dailyRevenue: 26.4,
      monthlyRevenue: 792,
      totalRevenue: 2640,
      usageCount: 470,
      status: "active",
      chargerCount: 8,
      utilization: 84,
    },
  ];

  // 전체 통계 계산
  const totalStats = {
    dailyRevenue: revenueData.reduce((sum, item) => sum + item.dailyRevenue, 0),
    monthlyRevenue: revenueData.reduce(
      (sum, item) => sum + item.monthlyRevenue,
      0
    ),
    totalRevenue: revenueData.reduce((sum, item) => sum + item.totalRevenue, 0),
    totalUsage: revenueData.reduce((sum, item) => sum + item.usageCount, 0),
    activeHubs: revenueData.filter((item) => item.status === "active").length,
    totalChargers: revenueData.reduce(
      (sum, item) => sum + item.chargerCount,
      0
    ),
    averageUtilization: Math.round(
      revenueData.reduce((sum, item) => sum + item.utilization, 0) /
        revenueData.length
    ),
  };

  return (
    <div className="revenue-page">
      <h1>수익 현황</h1>

      {/* 전체 통계 */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={8} md={8}>
          <Card className="stat-card">
            <Statistic
              title="일일 수익"
              value={totalStats.dailyRevenue}
              precision={1}
              suffix="ICP"
              prefix={<DollarOutlined style={{ color: "#0284c7" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={8}>
          <Card className="stat-card">
            <Statistic
              title="월간 수익"
              value={totalStats.monthlyRevenue}
              precision={1}
              suffix="ICP"
              prefix={<BarChartOutlined style={{ color: "#0284c7" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={8}>
          <Card className="stat-card">
            <Statistic
              title="총 수익"
              value={totalStats.totalRevenue}
              precision={1}
              suffix="ICP"
              prefix={<DollarOutlined style={{ color: "#0284c7" }} />}
            />
          </Card>
        </Col>
      </Row>

      <div className="search-box">
        <Input
          placeholder="충전 허브 검색..."
          prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
          size="middle"
        />
      </div>

      <Row gutter={[12, 12]}>
        {revenueData.map((hub) => (
          <Col key={hub.id} xs={24} sm={12} md={8} lg={6} xl={6}>
            <Card
              className="revenue-card"
              title={hub.name}
              cover={
                <div className="bg-[rgba(56,189,248,0.1)] flex items-center justify-center">
                  <DollarOutlined
                    style={{ fontSize: "40px", color: "#0284c7" }}
                  />
                </div>
              }
            >
              <div className="revenue-status">
                {hub.status === "active" ? "운영중" : "점검중"}
              </div>
              <div className="revenue-info">
                <div className="label">일일 수익</div>
                <div className="value">
                  {hub.dailyRevenue.toLocaleString()} ICP
                </div>
              </div>
              <div className="revenue-info">
                <div className="label">월간 수익</div>
                <div className="value">
                  {hub.monthlyRevenue.toLocaleString()} ICP
                </div>
              </div>
              <div className="revenue-info">
                <div className="label">총 수익</div>
                <div className="value">
                  {hub.totalRevenue.toLocaleString()} ICP
                </div>
              </div>
              <div className="revenue-info">
                <div className="label">충전기 수</div>
                <div className="value">{hub.chargerCount}대</div>
              </div>
              <div className="revenue-info">
                <div className="label">
                  <ClockCircleOutlined
                    style={{
                      color: "#0284c7",
                      marginRight: "4px",
                      fontSize: "12px",
                    }}
                  />
                  가동률
                </div>
                <div className="value">{hub.utilization}%</div>
              </div>
              <div className="revenue-info">
                <div className="label">총 사용 횟수</div>
                <div className="value">{hub.usageCount.toLocaleString()}회</div>
              </div>
              <Button
                type={hub.status === "active" ? "primary" : "default"}
                disabled={hub.status === "maintenance"}
                size="middle"
              >
                {hub.status === "active" ? "상세 보기" : "점검중"}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Revenue;
