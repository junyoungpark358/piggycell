import { Card, Row, Col, Statistic } from "antd";
import {
  WalletOutlined,
  BankOutlined,
  LineChartOutlined,
} from "@ant-design/icons";

const Home = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">
          PiggyCell에 오신 것을 환영합니다
        </h1>
        <p className="text-gray-600">
          충전기 NFT를 통해 안정적인 수익을 창출하세요
        </p>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card hoverable className="h-full">
            <Statistic
              title="보유 중인 NFT"
              value={0}
              prefix={<WalletOutlined className="text-[#38bdf8]" />}
              suffix="개"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable className="h-full">
            <Statistic
              title="스테이킹 중인 NFT"
              value={0}
              prefix={<BankOutlined className="text-[#0ea5e9]" />}
              suffix="개"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable className="h-full">
            <Statistic
              title="총 누적 수익"
              value={0}
              prefix={<LineChartOutlined className="text-[#0284c7]" />}
              suffix="ICP"
            />
          </Card>
        </Col>
      </Row>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6 text-center">시작하기</h2>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card
              hoverable
              title="1. NFT 구매하기"
              className="h-full text-center"
              styles={{ header: { borderBottom: 0 } }}
            >
              <p className="text-gray-600">
                마켓에서 원하는 충전기 NFT를 구매하세요.
              </p>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              hoverable
              title="2. 스테이킹하기"
              className="h-full text-center"
              styles={{ header: { borderBottom: 0 } }}
            >
              <p className="text-gray-600">
                구매한 NFT를 스테이킹하여 수익을 창출하세요.
              </p>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              hoverable
              title="3. 수익 확인하기"
              className="h-full text-center"
              styles={{ header: { borderBottom: 0 } }}
            >
              <p className="text-gray-600">
                스테이킹한 NFT의 수익을 실시간으로 확인하세요.
              </p>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Home;
