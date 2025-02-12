import { Card, Row, Col, Button, Statistic } from "antd";
import {
  BankOutlined,
  FieldTimeOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
} from "@ant-design/icons";

const Staking = () => {
  // 임시 스테이킹 데이터
  const stakingNFTs = [
    {
      id: 1,
      name: "충전기 #1",
      stakedAt: "2024-02-01",
      earnings: 25.5,
      status: "staking",
    },
    {
      id: 2,
      name: "충전기 #2",
      stakedAt: "2024-02-05",
      earnings: 18.2,
      status: "staking",
    },
    {
      id: 3,
      name: "충전기 #3",
      stakedAt: "2024-02-10",
      earnings: 10.8,
      status: "unstaked",
    },
  ];

  return (
    <div className="nft-market">
      <h1>스테이킹</h1>

      {/* 스테이킹 현황 통계 */}
      <Row gutter={[24, 24]} className="mb-8">
        <Col xs={24} md={8}>
          <Card hoverable className="nft-card">
            <Statistic
              title="총 스테이킹 수량"
              value={2}
              prefix={<BankOutlined className="text-[#38bdf8]" />}
              suffix="개"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable className="nft-card">
            <Statistic
              title="총 스테이킹 기간"
              value={15}
              prefix={<FieldTimeOutlined className="text-[#0ea5e9]" />}
              suffix="일"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable className="nft-card">
            <Statistic
              title="총 수익"
              value={54.5}
              prefix={<TrophyOutlined className="text-[#0284c7]" />}
              suffix="ICP"
            />
          </Card>
        </Col>
      </Row>

      {/* 스테이킹된 NFT 목록 */}
      <h2 className="text-xl font-bold mb-6">스테이킹 중인 NFT</h2>
      <Row gutter={[24, 24]}>
        {stakingNFTs.map((nft) => (
          <Col key={nft.id} xs={24} sm={12} md={8}>
            <Card
              className="nft-card"
              title={nft.name}
              cover={
                <div className="h-48 bg-[rgba(56,189,248,0.1)] flex items-center justify-center text-[#38bdf8]">
                  <ThunderboltOutlined style={{ fontSize: "48px" }} />
                </div>
              }
            >
              <div className="nft-status available">
                {nft.status === "staking" ? "스테이킹 중" : "언스테이킹됨"}
              </div>
              <div className="nft-info">
                <div className="label">스테이킹 시작일</div>
                <div className="value flex items-center">
                  <FieldTimeOutlined className="mr-1 text-[#38bdf8]" />
                  {nft.stakedAt}
                </div>
              </div>
              <div className="nft-info">
                <div className="label">현재 수익</div>
                <div className="value">{nft.earnings} ICP</div>
              </div>
              <Button
                className={nft.status === "unstaked" ? "disabled" : ""}
                disabled={nft.status === "unstaked"}
              >
                {nft.status === "staking" ? "언스테이킹" : "언스테이킹됨"}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Staking;
