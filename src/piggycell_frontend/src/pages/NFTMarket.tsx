import { Card, Row, Col, Button, Input, Statistic } from "antd";
import {
  SearchOutlined,
  EnvironmentOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import "./NFTMarket.css";

const NFTMarket = () => {
  // 임시 NFT 데이터
  const nfts = [
    {
      id: 1,
      name: "강남 충전 허브 #1",
      location: "서울시 강남구 역삼동",
      price: 100,
      status: "available",
      chargerCount: 8,
    },
    {
      id: 2,
      name: "서초 충전 허브 #1",
      location: "서울시 서초구 서초동",
      price: 150,
      status: "available",
      chargerCount: 6,
    },
    {
      id: 3,
      name: "송파 충전 허브 #1",
      location: "서울시 송파구 잠실동",
      price: 120,
      status: "sold",
      chargerCount: 4,
    },
    {
      id: 4,
      name: "강남 충전 허브 #2",
      location: "서울시 강남구 삼성동",
      price: 180,
      status: "available",
      chargerCount: 10,
    },
    {
      id: 5,
      name: "성동 충전 허브 #1",
      location: "서울시 성동구 성수동",
      price: 90,
      status: "available",
      chargerCount: 5,
    },
    {
      id: 6,
      name: "마포 충전 허브 #1",
      location: "서울시 마포구 합정동",
      price: 110,
      status: "sold",
      chargerCount: 6,
    },
    {
      id: 7,
      name: "영등포 충전 허브 #1",
      location: "서울시 영등포구 여의도동",
      price: 160,
      status: "available",
      chargerCount: 8,
    },
    {
      id: 8,
      name: "강서 충전 허브 #1",
      location: "서울시 강서구 마곡동",
      price: 95,
      status: "available",
      chargerCount: 4,
    },
    {
      id: 9,
      name: "용산 충전 허브 #1",
      location: "서울시 용산구 이태원동",
      price: 140,
      status: "sold",
      chargerCount: 7,
    },
    {
      id: 10,
      name: "서초 충전 허브 #2",
      location: "서울시 서초구 반포동",
      price: 170,
      status: "available",
      chargerCount: 9,
    },
    {
      id: 11,
      name: "강동 충전 허브 #1",
      location: "서울시 강동구 천호동",
      price: 85,
      status: "available",
      chargerCount: 5,
    },
    {
      id: 12,
      name: "송파 충전 허브 #2",
      location: "서울시 송파구 문정동",
      price: 130,
      status: "available",
      chargerCount: 7,
    },
  ];

  // 전체 통계 계산
  const totalStats = {
    totalNFTs: nfts.length,
    availableNFTs: nfts.filter((nft) => nft.status === "available").length,
    totalChargers: nfts.reduce((sum, nft) => sum + nft.chargerCount, 0),
  };

  return (
    <div className="nft-market">
      <h1>NFT 마켓</h1>

      {/* 전체 통계 */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={8} md={8}>
          <Card className="stat-card">
            <Statistic
              title="전체 NFT"
              value={totalStats.totalNFTs}
              suffix="개"
              prefix={<ShoppingCartOutlined style={{ color: "#0284c7" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={8}>
          <Card className="stat-card">
            <Statistic
              title="판매중인 NFT"
              value={totalStats.availableNFTs}
              suffix="개"
              prefix={<BarChartOutlined style={{ color: "#0284c7" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={8}>
          <Card className="stat-card">
            <Statistic
              title="총 충전기"
              value={totalStats.totalChargers}
              suffix="대"
              prefix={<ThunderboltOutlined style={{ color: "#0284c7" }} />}
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
        {nfts.map((nft) => (
          <Col key={nft.id} xs={24} sm={12} md={8} lg={6} xl={6}>
            <Card
              className="nft-card"
              title={nft.name}
              cover={
                <div className="bg-[rgba(56,189,248,0.1)] flex items-center justify-center">
                  <ShoppingCartOutlined
                    style={{ fontSize: "40px", color: "#0284c7" }}
                  />
                </div>
              }
            >
              <div className="nft-status">
                {nft.status === "available" ? "판매중" : "판매완료"}
              </div>
              <div className="nft-info location">
                <div className="label">위치</div>
                <div className="value">
                  <EnvironmentOutlined
                    style={{
                      color: "#0284c7",
                      marginRight: "4px",
                      fontSize: "12px",
                    }}
                  />
                  {nft.location}
                </div>
              </div>
              <div className="nft-info">
                <div className="label">충전기</div>
                <div className="value">{nft.chargerCount}대</div>
              </div>
              <div className="nft-info">
                <div className="label">가격</div>
                <div className="value">{nft.price} ICP</div>
              </div>
              <Button
                type={nft.status === "available" ? "primary" : "default"}
                disabled={nft.status === "sold"}
                size="middle"
              >
                {nft.status === "available" ? "구매하기" : "판매완료"}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default NFTMarket;
