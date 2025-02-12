import { Card, Row, Col, Button, Input } from "antd";
import {
  SearchOutlined,
  EnvironmentOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";

const NFTMarket = () => {
  // 임시 NFT 데이터
  const nfts = [
    {
      id: 1,
      name: "충전기 #1",
      location: "서울시 강남구",
      price: 100,
      status: "available",
    },
    {
      id: 2,
      name: "충전기 #2",
      location: "서울시 서초구",
      price: 150,
      status: "available",
    },
    {
      id: 3,
      name: "충전기 #3",
      location: "서울시 송파구",
      price: 120,
      status: "sold",
    },
  ];

  return (
    <div className="nft-market">
      <h1>NFT 마켓</h1>
      <div className="search-box mx-auto mb-8">
        <Input
          placeholder="충전기 검색..."
          prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
          className="w-full"
        />
      </div>
      <Row gutter={[24, 24]}>
        {nfts.map((nft) => (
          <Col key={nft.id} xs={24} sm={12} md={8}>
            <Card
              className="nft-card"
              title={nft.name}
              cover={
                <div className="h-48 bg-[rgba(56,189,248,0.1)] flex items-center justify-center">
                  <ShoppingCartOutlined
                    style={{ fontSize: "48px", color: "#0284c7" }}
                  />
                </div>
              }
            >
              <div className="nft-status available">
                {nft.status === "available" ? "판매중" : "판매완료"}
              </div>
              <div className="nft-info">
                <div className="label">위치</div>
                <div className="value flex items-center">
                  <EnvironmentOutlined
                    style={{ color: "#0284c7", marginRight: "8px" }}
                  />
                  {nft.location}
                </div>
              </div>
              <div className="nft-info">
                <div className="label">가격</div>
                <div className="value">{nft.price} ICP</div>
              </div>
              <Button
                className={nft.status === "sold" ? "disabled" : ""}
                disabled={nft.status === "sold"}
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
