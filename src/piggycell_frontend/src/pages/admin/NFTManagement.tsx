import { Table, Button, Modal, Form, Input, Space, Card } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useState } from "react";

const NFTManagement = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 임시 NFT 데이터
  const nfts = [
    {
      key: "1",
      id: "충전기 #1",
      location: "서울시 강남구",
      status: "판매중",
      price: 100,
      owner: "미할당",
    },
    {
      key: "2",
      id: "충전기 #2",
      location: "서울시 서초구",
      status: "판매완료",
      price: 150,
      owner: "0x1234...5678",
    },
  ];

  const columns = [
    {
      title: "NFT ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "위치",
      dataIndex: "location",
      key: "location",
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
    },
    {
      title: "가격",
      dataIndex: "price",
      key: "price",
      render: (price: number) => `${price} ICP`,
    },
    {
      title: "소유자",
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

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      console.log("Success:", values);
      setIsModalVisible(false);
      form.resetFields();
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">NFT 관리</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNFT}>
          NFT 추가
        </Button>
      </div>

      <Card>
        <Table columns={columns} dataSource={nfts} />
      </Card>

      <Modal
        title="NFT 추가"
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
            name="price"
            label="가격 (ICP)"
            rules={[{ required: true, message: "가격을 입력해주세요" }]}
          >
            <Input type="number" placeholder="예: 100" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NFTManagement;
