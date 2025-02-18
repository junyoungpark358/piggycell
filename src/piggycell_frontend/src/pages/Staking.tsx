import { Card, Row, Col, Button, Input, Statistic } from "antd";
import {
  SearchOutlined,
  BankOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import "./Staking.css";

const Staking = () => {
  // 임시 스테이킹 데이터
  const stakingData = [
    {
      id: 1,
      nftId: "강남 충전 허브 #1",
      stakedAmount: 1000,
      rewardRate: 12.5,
      accumulatedRewards: 125,
      stakingPeriod: "30일",
    },
    {
      id: 2,
      nftId: "서초 충전 허브 #1",
      stakedAmount: 1500,
      rewardRate: 15.0,
      accumulatedRewards: 225,
      stakingPeriod: "60일",
    },
    {
      id: 3,
      nftId: "송파 충전 허브 #1",
      stakedAmount: 800,
      rewardRate: 10.0,
      accumulatedRewards: 80,
      stakingPeriod: "15일",
    },
    {
      id: 4,
      nftId: "강남 충전 허브 #2",
      stakedAmount: 2000,
      rewardRate: 18.0,
      accumulatedRewards: 360,
      stakingPeriod: "90일",
    },
    {
      id: 5,
      nftId: "성동 충전 허브 #1",
      stakedAmount: 1200,
      rewardRate: 13.5,
      accumulatedRewards: 162,
      stakingPeriod: "45일",
    },
    {
      id: 6,
      nftId: "마포 충전 허브 #1",
      stakedAmount: 900,
      rewardRate: 11.0,
      accumulatedRewards: 99,
      stakingPeriod: "30일",
    },
    {
      id: 7,
      nftId: "영등포 충전 허브 #1",
      stakedAmount: 1800,
      rewardRate: 16.5,
      accumulatedRewards: 297,
      stakingPeriod: "75일",
    },
    {
      id: 8,
      nftId: "강서 충전 허브 #1",
      stakedAmount: 600,
      rewardRate: 9.0,
      accumulatedRewards: 54,
      stakingPeriod: "15일",
    },
    {
      id: 9,
      nftId: "용산 충전 허브 #1",
      stakedAmount: 1600,
      rewardRate: 15.5,
      accumulatedRewards: 248,
      stakingPeriod: "60일",
    },
    {
      id: 10,
      nftId: "서초 충전 허브 #2",
      stakedAmount: 2200,
      rewardRate: 19.0,
      accumulatedRewards: 418,
      stakingPeriod: "90일",
    },
    {
      id: 11,
      nftId: "강동 충전 허브 #1",
      stakedAmount: 750,
      rewardRate: 10.5,
      accumulatedRewards: 78.75,
      stakingPeriod: "30일",
    },
    {
      id: 12,
      nftId: "송파 충전 허브 #2",
      stakedAmount: 1300,
      rewardRate: 14.0,
      accumulatedRewards: 182,
      stakingPeriod: "45일",
    },
    {
      id: 13,
      nftId: "중구 충전 허브 #1",
      stakedAmount: 2500,
      rewardRate: 20.0,
      accumulatedRewards: 500,
      stakingPeriod: "90일",
    },
    {
      id: 14,
      nftId: "종로 충전 허브 #1",
      stakedAmount: 1900,
      rewardRate: 17.0,
      accumulatedRewards: 323,
      stakingPeriod: "75일",
    },
    {
      id: 15,
      nftId: "광진 충전 허브 #1",
      stakedAmount: 1100,
      rewardRate: 12.0,
      accumulatedRewards: 132,
      stakingPeriod: "45일",
    },
    {
      id: 16,
      nftId: "동대문 충전 허브 #1",
      stakedAmount: 1400,
      rewardRate: 14.5,
      accumulatedRewards: 203,
      stakingPeriod: "60일",
    },
    {
      id: 17,
      nftId: "성북 충전 허브 #1",
      stakedAmount: 850,
      rewardRate: 11.5,
      accumulatedRewards: 97.75,
      stakingPeriod: "30일",
    },
    {
      id: 18,
      nftId: "노원 충전 허브 #1",
      stakedAmount: 950,
      rewardRate: 12.0,
      accumulatedRewards: 114,
      stakingPeriod: "45일",
    },
    {
      id: 19,
      nftId: "은평 충전 허브 #1",
      stakedAmount: 700,
      rewardRate: 10.0,
      accumulatedRewards: 70,
      stakingPeriod: "30일",
    },
    {
      id: 20,
      nftId: "강남 충전 허브 #3",
      stakedAmount: 3000,
      rewardRate: 22.0,
      accumulatedRewards: 660,
      stakingPeriod: "90일",
    },
  ];

  // 전체 통계 계산
  const totalStats = {
    totalStaked: stakingData.reduce((sum, item) => sum + item.stakedAmount, 0),
    totalRewards: stakingData.reduce(
      (sum, item) => sum + item.accumulatedRewards,
      0
    ),
    activeStakings: stakingData.length,
    averageRewardRate: "11%",
  };

  return (
    <div className="staking-page">
      <div className="page-header">
        <h1 className="text-5xl font-extrabold mb-6 text-sky-600">스테이킹</h1>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="총 스테이킹"
              value={totalStats.totalStaked}
              prefix={<BankOutlined style={{ color: "#0284c7" }} />}
              suffix="ICP"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="총 획득 보상"
              value={totalStats.totalRewards}
              prefix={<DollarOutlined style={{ color: "#0284c7" }} />}
              suffix="ICP"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="활성 스테이킹"
              value={totalStats.activeStakings}
              prefix={<ThunderboltOutlined style={{ color: "#0284c7" }} />}
              suffix="개"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="평균 보상률"
              value={totalStats.averageRewardRate}
              prefix={<LineChartOutlined style={{ color: "#0284c7" }} />}
            />
          </Card>
        </Col>
      </Row>

      <div className="search-box">
        <Input
          placeholder="스테이킹 검색..."
          prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
          size="middle"
        />
      </div>

      <Row gutter={[16, 16]}>
        {stakingData.map((staking) => (
          <Col key={staking.id} xs={24} sm={12} md={8} lg={6}>
            <Card title={staking.nftId} className="staking-card">
              <div className="mb-4">
                <p className="text-gray-600 mb-2 flex items-center">
                  <BankOutlined className="mr-3 text-sky-600" />
                  <span className="font-medium mr-2">스테이킹 금액:</span>{" "}
                  {staking.stakedAmount} ICP
                </p>
                <p className="text-gray-600 mb-2 flex items-center">
                  <LineChartOutlined className="mr-3 text-sky-600" />
                  <span className="font-medium mr-2">보상률:</span>{" "}
                  {staking.rewardRate}%
                </p>
                <p className="text-gray-600 mb-2 flex items-center">
                  <DollarOutlined className="mr-3 text-sky-600" />
                  <span className="font-medium mr-2">누적 보상:</span>{" "}
                  {staking.accumulatedRewards} ICP
                </p>
                <p className="text-gray-600 flex items-center">
                  <ThunderboltOutlined className="mr-3 text-sky-600" />
                  <span className="font-medium mr-2">스테이킹 기간:</span>{" "}
                  {staking.stakingPeriod}
                </p>
              </div>
              <Button type="primary" block>
                보상 수령하기
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Staking;
