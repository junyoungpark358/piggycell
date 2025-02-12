import { Table, Card, Row, Col, Statistic, DatePicker, Button } from "antd";
import {
  LineChartOutlined,
  RiseOutlined,
  DownloadOutlined,
} from "@ant-design/icons";

const { RangePicker } = DatePicker;

const AdminRevenue = () => {
  // 임시 수익 데이터
  const revenueData = [
    {
      key: "1",
      date: "2024-02-12",
      totalRevenue: 150.5,
      nftCount: 8,
      activeUsers: 25,
      stakingRewards: 12.5,
    },
    {
      key: "2",
      date: "2024-02-11",
      totalRevenue: 120.8,
      nftCount: 8,
      activeUsers: 22,
      stakingRewards: 10.2,
    },
  ];

  const columns = [
    {
      title: "날짜",
      dataIndex: "date",
      key: "date",
    },
    {
      title: "총 수익",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      render: (value: number) => `${value} ICP`,
    },
    {
      title: "활성 NFT 수",
      dataIndex: "nftCount",
      key: "nftCount",
      render: (value: number) => `${value}개`,
    },
    {
      title: "활성 사용자 수",
      dataIndex: "activeUsers",
      key: "activeUsers",
      render: (value: number) => `${value}명`,
    },
    {
      title: "스테이킹 보상",
      dataIndex: "stakingRewards",
      key: "stakingRewards",
      render: (value: number) => `${value} ICP`,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">수익 관리</h1>
      <div className="flex justify-between items-center mb-6">
        <RangePicker className="w-64" />
        <Button icon={<DownloadOutlined />}>보고서 다운로드</Button>
      </div>
      <Row gutter={[16, 16]} className="mb-6">
        <Col span={8}>
          <Card>
            <Statistic
              title="이번 달 총 수익"
              value={271.3}
              prefix={<LineChartOutlined />}
              suffix="ICP"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="전월 대비"
              value={12.5}
              prefix={<RiseOutlined />}
              suffix="%"
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="스테이킹 보상 지급액"
              value={22.7}
              prefix={<LineChartOutlined />}
              suffix="ICP"
            />
          </Card>
        </Col>
      </Row>
      <Card title="일별 수익 현황">
        <Table columns={columns} dataSource={revenueData} />
      </Card>
    </div>
  );
};

export default AdminRevenue;
