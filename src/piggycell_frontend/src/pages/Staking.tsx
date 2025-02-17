import { Card, Row, Col, Button, Input, Statistic } from "antd";
import {
  SearchOutlined,
  ThunderboltOutlined,
  FieldTimeOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import "./Staking.css";

const Staking = () => {
  // 임시 스테이킹 데이터
  const stakingPools = [
    {
      id: 1,
      name: "기본 스테이킹 풀",
      apr: 12.5,
      minLockPeriod: 30,
      totalStaked: 25000,
      myStaked: 1000,
      status: "staking",
      maxStakeAmount: 50000,
      remainingCapacity: 25000,
    },
    {
      id: 2,
      name: "실버 스테이킹 풀",
      apr: 15.8,
      minLockPeriod: 90,
      totalStaked: 45000,
      myStaked: 0,
      status: "available",
      maxStakeAmount: 100000,
      remainingCapacity: 55000,
    },
    {
      id: 3,
      name: "골드 스테이킹 풀",
      apr: 18.2,
      minLockPeriod: 180,
      totalStaked: 75000,
      myStaked: 2500,
      status: "staking",
      maxStakeAmount: 150000,
      remainingCapacity: 75000,
    },
    {
      id: 4,
      name: "플래티넘 스테이킹 풀",
      apr: 20.5,
      minLockPeriod: 365,
      totalStaked: 120000,
      myStaked: 0,
      status: "available",
      maxStakeAmount: 200000,
      remainingCapacity: 80000,
    },
    {
      id: 5,
      name: "다이아몬드 스테이킹 풀",
      apr: 22.0,
      minLockPeriod: 730,
      totalStaked: 250000,
      myStaked: 5000,
      status: "staking",
      maxStakeAmount: 500000,
      remainingCapacity: 250000,
    },
    {
      id: 6,
      name: "블랙 스테이킹 풀",
      apr: 25.0,
      minLockPeriod: 1095,
      totalStaked: 500000,
      myStaked: 0,
      status: "available",
      maxStakeAmount: 1000000,
      remainingCapacity: 500000,
    },
    {
      id: 7,
      name: "3개월 특별 풀",
      apr: 16.5,
      minLockPeriod: 90,
      totalStaked: 35000,
      myStaked: 1500,
      status: "staking",
      maxStakeAmount: 75000,
      remainingCapacity: 40000,
    },
    {
      id: 8,
      name: "6개월 특별 풀",
      apr: 19.5,
      minLockPeriod: 180,
      totalStaked: 85000,
      myStaked: 0,
      status: "available",
      maxStakeAmount: 150000,
      remainingCapacity: 65000,
    },
    {
      id: 9,
      name: "1년 특별 풀",
      apr: 23.0,
      minLockPeriod: 365,
      totalStaked: 180000,
      myStaked: 3000,
      status: "staking",
      maxStakeAmount: 300000,
      remainingCapacity: 120000,
    },
    {
      id: 10,
      name: "2년 특별 풀",
      apr: 26.0,
      minLockPeriod: 730,
      totalStaked: 320000,
      myStaked: 0,
      status: "available",
      maxStakeAmount: 500000,
      remainingCapacity: 180000,
    },
    {
      id: 11,
      name: "신규 유저 전용 풀",
      apr: 30.0,
      minLockPeriod: 30,
      totalStaked: 15000,
      myStaked: 0,
      status: "available",
      maxStakeAmount: 25000,
      remainingCapacity: 10000,
    },
    {
      id: 12,
      name: "VIP 전용 풀",
      apr: 28.0,
      minLockPeriod: 365,
      totalStaked: 450000,
      myStaked: 10000,
      status: "staking",
      maxStakeAmount: 1000000,
      remainingCapacity: 550000,
    },
  ];

  // 전체 통계 계산
  const totalStats = {
    totalStaked: stakingPools.reduce((sum, pool) => sum + pool.totalStaked, 0),
    myTotalStaked: stakingPools.reduce((sum, pool) => sum + pool.myStaked, 0),
    averageApr: Math.round(
      stakingPools.reduce((sum, pool) => sum + pool.apr, 0) /
        stakingPools.length
    ),
  };

  return (
    <div className="staking-page">
      <h1>스테이킹</h1>

      {/* 전체 통계 */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={8} md={8}>
          <Card className="stat-card">
            <Statistic
              title="총 스테이킹"
              value={totalStats.totalStaked}
              precision={0}
              suffix="ICP"
              prefix={<ThunderboltOutlined style={{ color: "#0284c7" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={8}>
          <Card className="stat-card">
            <Statistic
              title="내 스테이킹"
              value={totalStats.myTotalStaked}
              precision={0}
              suffix="ICP"
              prefix={<DollarOutlined style={{ color: "#0284c7" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={8}>
          <Card className="stat-card">
            <Statistic
              title="평균 APR"
              value={totalStats.averageApr}
              precision={1}
              suffix="%"
              prefix={<FieldTimeOutlined style={{ color: "#0284c7" }} />}
            />
          </Card>
        </Col>
      </Row>

      <div className="search-box">
        <Input
          placeholder="스테이킹 풀 검색..."
          prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
          size="middle"
        />
      </div>
      <Row gutter={[12, 12]}>
        {stakingPools.map((pool) => (
          <Col key={pool.id} xs={24} sm={12} md={8} lg={6} xl={6}>
            <Card
              className="staking-card"
              title={pool.name}
              cover={
                <div className="bg-[rgba(56,189,248,0.1)] flex items-center justify-center">
                  <ThunderboltOutlined
                    style={{ fontSize: "40px", color: "#0284c7" }}
                  />
                </div>
              }
            >
              <div className="staking-status">
                {pool.status === "staking" ? "스테이킹 중" : "스테이킹 가능"}
              </div>
              <div className="staking-info">
                <div className="label">APR</div>
                <div className="value">{pool.apr}%</div>
              </div>
              <div className="staking-info">
                <div className="label">
                  <FieldTimeOutlined
                    style={{
                      color: "#0284c7",
                      marginRight: "4px",
                      fontSize: "12px",
                    }}
                  />
                  최소 잠금 기간
                </div>
                <div className="value">{pool.minLockPeriod}일</div>
              </div>
              <div className="staking-info">
                <div className="label">총 스테이킹</div>
                <div className="value">
                  {pool.totalStaked.toLocaleString()} ICP
                </div>
              </div>
              <div className="staking-info">
                <div className="label">내 스테이킹</div>
                <div className="value">
                  {pool.myStaked.toLocaleString()} ICP
                </div>
              </div>
              <div className="staking-info">
                <div className="label">남은 수량</div>
                <div className="value">
                  {pool.remainingCapacity.toLocaleString()} ICP
                </div>
              </div>
              <Button
                type={pool.status === "available" ? "primary" : "default"}
                size="middle"
              >
                {pool.status === "available"
                  ? "스테이킹 하기"
                  : "스테이킹 관리"}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Staking;
