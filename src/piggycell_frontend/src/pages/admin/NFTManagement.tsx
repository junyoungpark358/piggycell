import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Card,
  DatePicker,
  Select,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import { AuthManager } from "../../utils/auth";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import "./NFTManagement.css";

// TODO: canister IDL 파일 경로 수정 필요
// import { idlFactory } from "../../declarations/piggycell_backend/piggycell_backend.did.js";

// 임시 타입 정의
type MintResult = {
  ok?: number;
  err?: string;
};

const NFTManagement = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 임시 NFT 데이터
  const nfts = [
    {
      id: 1,
      name: "강남 충전 허브 #1",
      location: "서울시 강남구 역삼동",
      price: 100,
      status: "available",
      chargerCount: 8,
      createdAt: "2024-03-15",
    },
    {
      id: 2,
      name: "서초 충전 허브 #1",
      location: "서울시 서초구 서초동",
      price: 150,
      status: "available",
      chargerCount: 6,
      createdAt: "2024-03-15",
    },
    {
      id: 3,
      name: "송파 충전 허브 #1",
      location: "서울시 송파구 잠실동",
      price: 120,
      status: "sold",
      chargerCount: 4,
      createdAt: "2024-03-14",
    },
  ];

  // 전체 통계 계산
  const totalStats = {
    totalNFTs: nfts.length,
    availableNFTs: nfts.filter((nft) => nft.status === "available").length,
    totalChargers: nfts.reduce((sum, nft) => sum + nft.chargerCount, 0),
    totalValue: nfts.reduce((sum, nft) => sum + nft.price, 0),
  };

  const columns = [
    {
      title: "허브 ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "위치",
      dataIndex: "location",
      key: "location",
    },
    {
      title: "충전기 수",
      dataIndex: "chargerCount",
      key: "chargerCount",
      render: (count: number) => `${count}대`,
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        switch (status) {
          case "available":
            return "판매중";
          case "sold":
            return "판매완료";
          case "created":
            return "생성완료";
          default:
            return status;
        }
      },
    },
    {
      title: "임대자",
      dataIndex: "owner",
      key: "owner",
    },
    {
      title: "작업",
      key: "action",
      render: () => (
        <Space size="middle">
          <Button icon={<EditOutlined />} />
          <Button icon={<DeleteOutlined />} danger />
        </Space>
      ),
    },
  ];

  const handleAddNFT = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      // AuthManager를 통해 Identity 가져오기
      const authManager = AuthManager.getInstance();
      const identity = await authManager.getIdentity();

      if (!identity) {
        throw new Error("Not authenticated");
      }

      // Agent 생성
      const agent = new HttpAgent({ identity });

      // 로컬 개발 환경에서는 agent 인증서 검증 건너뛰기
      if (process.env.NODE_ENV !== "production") {
        await agent.fetchRootKey();
      }

      // TODO: Canister ID 환경변수 설정 필요
      const canisterId = process.env.CANISTER_ID_PIGGYCELL_BACKEND;
      if (!canisterId) {
        throw new Error("Canister ID not found");
      }

      // NFT 메타데이터 생성
      const metadata = [
        ["location", { Text: values.location }],
        ["chargerCount", { Nat: Number(values.chargerCount) }],
        ["status", { Text: values.status }],
      ];

      // NFT 민팅
      const mintArgs = {
        to: { owner: identity.getPrincipal(), subaccount: null },
        token_id: Date.now(), // 임시 토큰 ID 생성 방식
        metadata: metadata,
      };

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error("Failed to mint NFT:", error);
      // TODO: 에러 처리
    }
  };

  const handleModalCancel = () => {
    form.resetFields();
    setIsModalVisible(false);
  };

  return (
    <div className="nft-management">
      <div className="page-header">
        <h1 className="text-5xl font-extrabold mb-6 text-sky-600">NFT 관리</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNFT}>
          새 NFT 생성
        </Button>
      </div>

      {/* 전체 통계 */}
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

      <Card className="table-card">
        <Table columns={columns} dataSource={nfts} />
      </Card>

      <Modal
        title="충전 허브 NFT 추가"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="location"
            label="위치"
            rules={[{ required: true, message: "위치를 입력해주세요" }]}
          >
            <Input placeholder="예: 서울시 강남구" />
          </Form.Item>
          <Form.Item
            name="chargerCount"
            label="충전기 수"
            rules={[{ required: true, message: "충전기 수를 입력해주세요" }]}
          >
            <Input type="number" placeholder="예: 8" />
          </Form.Item>
          <Form.Item
            name="transferType"
            label="NFT 발행 방식"
            rules={[{ required: true, message: "발행 방식을 선택해주세요" }]}
          >
            <Select>
              <Select.Option value="market">NFT 마켓 등록</Select.Option>
              <Select.Option value="address">지갑 주소로 전송</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.transferType !== currentValues.transferType
            }
          >
            {({ getFieldValue }) =>
              getFieldValue("transferType") === "market" ? (
                <Form.Item
                  name="price"
                  label="판매 가격 (PGC)"
                  rules={[
                    { required: true, message: "판매 가격을 입력해주세요" },
                  ]}
                >
                  <Input type="number" placeholder="예: 1000" />
                </Form.Item>
              ) : getFieldValue("transferType") === "address" ? (
                <Form.Item
                  name="transferAddress"
                  label="지갑 주소"
                  rules={[
                    { required: true, message: "지갑 주소를 입력해주세요" },
                  ]}
                >
                  <Input placeholder="NFT를 전송할 지갑 주소를 입력하세요" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NFTManagement;
