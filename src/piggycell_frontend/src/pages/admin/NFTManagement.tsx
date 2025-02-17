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
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useState } from "react";
import { AuthManager } from "../../utils/auth";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

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
      key: "1",
      id: "충전 허브 #1",
      location: "서울시 강남구",
      status: "임대 가능",
      chargerCount: 8,
      owner: "미할당",
    },
    {
      key: "2",
      id: "충전 허브 #2",
      location: "서울시 서초구",
      status: "임대중",
      chargerCount: 6,
      owner: "0x1234...5678",
    },
  ];

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">충전 허브 NFT 관리</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNFT}>
          충전 허브 추가
        </Button>
      </div>

      <Card>
        <Table columns={columns} dataSource={nfts} />
      </Card>

      <Modal
        title="충전 허브 NFT 추가"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
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
            name="status"
            label="상태"
            rules={[{ required: true, message: "상태를 선택해주세요" }]}
          >
            <Select>
              <Select.Option value="available">임대 가능</Select.Option>
              <Select.Option value="rented">임대중</Select.Option>
              <Select.Option value="maintenance">유지보수 중</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NFTManagement;
