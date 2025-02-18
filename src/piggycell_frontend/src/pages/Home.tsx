import { Card, Row, Col, Button, Statistic } from "antd";
import {
  ThunderboltOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  BankOutlined,
} from "@ant-design/icons";
import "./Home.css";

const Home = () => {
  return (
    <div className="home-page">
      <div className="page-header">
        <h1 className="text-5xl font-extrabold mb-6 text-sky-600">PiggyCell</h1>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="전체 충전소"
              value={25}
              prefix={<ThunderboltOutlined style={{ color: "#0284c7" }} />}
              suffix="개"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="발행된 NFT"
              value={100}
              prefix={<ShoppingCartOutlined style={{ color: "#0284c7" }} />}
              suffix="개"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="활성 투자자"
              value={50}
              prefix={<UserOutlined style={{ color: "#0284c7" }} />}
              suffix="명"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="스테이킹 참여"
              value={30}
              prefix={<BankOutlined style={{ color: "#0284c7" }} />}
              suffix="명"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="feature-row">
        <Col xs={24} sm={12} md={8}>
          <Card className="feature-card">
            <h3 className="text-xl font-bold mb-4">NFT 마켓</h3>
            <p className="text-gray-600 mb-4">
              충전소 NFT를 구매하고 수익을 창출하세요
            </p>
            <Button type="primary" size="large">
              마켓 둘러보기
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="feature-card">
            <h3 className="text-xl font-bold mb-4">스테이킹</h3>
            <p className="text-gray-600 mb-4">
              NFT를 스테이킹하고 추가 수익을 얻으세요
            </p>
            <Button type="primary" size="large">
              스테이킹 참여하기
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="feature-card">
            <h3 className="text-xl font-bold mb-4">수익 관리</h3>
            <p className="text-gray-600 mb-4">
              투자 수익을 실시간으로 확인하세요
            </p>
            <Button type="primary" size="large">
              수익 확인하기
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Home;
