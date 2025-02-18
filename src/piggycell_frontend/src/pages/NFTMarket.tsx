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
    {
      id: 13,
      name: "중구 충전 허브 #1",
      location: "서울시 중구 명동",
      price: 200,
      status: "available",
      chargerCount: 12,
    },
    {
      id: 14,
      name: "종로 충전 허브 #1",
      location: "서울시 종로구 인사동",
      price: 175,
      status: "sold",
      chargerCount: 8,
    },
    {
      id: 15,
      name: "광진 충전 허브 #1",
      location: "서울시 광진구 구의동",
      price: 115,
      status: "available",
      chargerCount: 6,
    },
    {
      id: 16,
      name: "동대문 충전 허브 #1",
      location: "서울시 동대문구 청량리동",
      price: 125,
      status: "available",
      chargerCount: 7,
    },
    {
      id: 17,
      name: "성북 충전 허브 #1",
      location: "서울시 성북구 길음동",
      price: 95,
      status: "sold",
      chargerCount: 5,
    },
    {
      id: 18,
      name: "노원 충전 허브 #1",
      location: "서울시 노원구 상계동",
      price: 105,
      status: "available",
      chargerCount: 6,
    },
    {
      id: 19,
      name: "은평 충전 허브 #1",
      location: "서울시 은평구 불광동",
      price: 88,
      status: "available",
      chargerCount: 4,
    },
    {
      id: 20,
      name: "강남 충전 허브 #3",
      location: "서울시 강남구 청담동",
      price: 220,
      status: "available",
      chargerCount: 15,
    },
  ];

  // 전체 통계 계산
  const totalStats = {
    totalNFTs: nfts.length,
    availableNFTs: nfts.filter((nft) => nft.status === "available").length,
    totalChargers: nfts.reduce((sum, nft) => sum + nft.chargerCount, 0),
    totalValue: nfts.reduce((sum, nft) => sum + nft.price, 0),
  };

  return (
    <div className="nft-market">
      <div className="page-header">
        <h1 className="text-5xl font-extrabold mb-6 text-sky-600">NFT 마켓</h1>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="전체 충전 허브"
              value={totalStats.totalNFTs}
              suffix="개"
              prefix={<ShoppingCartOutlined style={{ color: "#0284c7" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="판매중인 충전 허브"
              value={totalStats.availableNFTs}
              suffix="개"
              prefix={<BarChartOutlined style={{ color: "#0284c7" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="총 설치 충전기"
              value={totalStats.totalChargers}
              suffix="대"
              prefix={<ThunderboltOutlined style={{ color: "#0284c7" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="충전 허브 총 가치"
              value={totalStats.totalValue}
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

      <Row gutter={[16, 16]}>
        {nfts.map((nft) => (
          <Col key={nft.id} xs={24} sm={12} md={8} lg={6}>
            <Card title={nft.name} className="nft-card">
              <div className="mb-4">
                <p className="text-gray-600 mb-2 flex items-center">
                  <EnvironmentOutlined className="mr-3 text-sky-600" />
                  <span className="font-medium mr-2">위치:</span> {nft.location}
                </p>
                <p className="text-gray-600 mb-2 flex items-center">
                  <DollarOutlined className="mr-3 text-sky-600" />
                  <span className="font-medium mr-2">가격:</span> {nft.price}{" "}
                  ICP
                </p>
                <p className="text-gray-600 flex items-center">
                  <ThunderboltOutlined className="mr-3 text-sky-600" />
                  <span className="font-medium mr-2">충전기:</span>{" "}
                  {nft.chargerCount}대
                </p>
              </div>
              <Button
                type={nft.status === "sold" ? "default" : "primary"}
                className={nft.status === "sold" ? "sold-button" : ""}
                disabled={nft.status === "sold"}
                block
              >
                {nft.status === "sold" ? "판매 완료" : "구매하기"}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default NFTMarket;
