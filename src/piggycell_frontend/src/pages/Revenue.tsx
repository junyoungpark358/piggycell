import { Row, Col } from "antd";
import {
  SearchOutlined,
  DollarOutlined,
  LineChartOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import "./Revenue.css";
import { StatCard } from "../components/StatCard";
import { NFTCard } from "../components/NFTCard";
import { StyledButton } from "../components/common/StyledButton";
import { StyledInput } from "../components/common/StyledInput";
import { message } from "antd";
import { useEffect, useState } from "react";

const Revenue = () => {
  // 로딩 상태 추가
  const [loading, setLoading] = useState(false);

  // 임시 수익 데이터
  const revenueData = [
    {
      id: 1,
      nftId: "강남 충전 허브 #1",
      dailyRevenue: 250,
      monthlyRevenue: 7500,
      totalRevenue: 45000,
      successRate: 98.5,
    },
    {
      id: 2,
      nftId: "서초 충전 허브 #1",
      dailyRevenue: 320,
      monthlyRevenue: 9600,
      totalRevenue: 57600,
      successRate: 97.8,
    },
    {
      id: 3,
      nftId: "송파 충전 허브 #1",
      dailyRevenue: 180,
      monthlyRevenue: 5400,
      totalRevenue: 32400,
      successRate: 99.1,
    },
    {
      id: 4,
      nftId: "강남 충전 허브 #2",
      dailyRevenue: 420,
      monthlyRevenue: 12600,
      totalRevenue: 75600,
      successRate: 98.9,
    },
    {
      id: 5,
      nftId: "성동 충전 허브 #1",
      dailyRevenue: 150,
      monthlyRevenue: 4500,
      totalRevenue: 27000,
      successRate: 97.5,
    },
    {
      id: 6,
      nftId: "마포 충전 허브 #1",
      dailyRevenue: 280,
      monthlyRevenue: 8400,
      totalRevenue: 50400,
      successRate: 98.2,
    },
    {
      id: 7,
      nftId: "영등포 충전 허브 #1",
      dailyRevenue: 350,
      monthlyRevenue: 10500,
      totalRevenue: 63000,
      successRate: 99.3,
    },
    {
      id: 8,
      nftId: "강서 충전 허브 #1",
      dailyRevenue: 200,
      monthlyRevenue: 6000,
      totalRevenue: 36000,
      successRate: 98.7,
    },
    {
      id: 9,
      nftId: "용산 충전 허브 #1",
      dailyRevenue: 290,
      monthlyRevenue: 8700,
      totalRevenue: 52200,
      successRate: 98.4,
    },
    {
      id: 10,
      nftId: "서초 충전 허브 #2",
      dailyRevenue: 380,
      monthlyRevenue: 11400,
      totalRevenue: 68400,
      successRate: 99.0,
    },
    {
      id: 11,
      nftId: "강동 충전 허브 #1",
      dailyRevenue: 170,
      monthlyRevenue: 5100,
      totalRevenue: 30600,
      successRate: 97.9,
    },
    {
      id: 12,
      nftId: "송파 충전 허브 #2",
      dailyRevenue: 310,
      monthlyRevenue: 9300,
      totalRevenue: 55800,
      successRate: 98.6,
    },
    {
      id: 13,
      nftId: "중구 충전 허브 #1",
      dailyRevenue: 450,
      monthlyRevenue: 13500,
      totalRevenue: 81000,
      successRate: 99.4,
    },
    {
      id: 14,
      nftId: "종로 충전 허브 #1",
      dailyRevenue: 340,
      monthlyRevenue: 10200,
      totalRevenue: 61200,
      successRate: 98.8,
    },
    {
      id: 15,
      nftId: "광진 충전 허브 #1",
      dailyRevenue: 260,
      monthlyRevenue: 7800,
      totalRevenue: 46800,
      successRate: 98.3,
    },
    {
      id: 16,
      nftId: "동대문 충전 허브 #1",
      dailyRevenue: 230,
      monthlyRevenue: 6900,
      totalRevenue: 41400,
      successRate: 98.1,
    },
    {
      id: 17,
      nftId: "성북 충전 허브 #1",
      dailyRevenue: 190,
      monthlyRevenue: 5700,
      totalRevenue: 34200,
      successRate: 97.7,
    },
    {
      id: 18,
      nftId: "노원 충전 허브 #1",
      dailyRevenue: 210,
      monthlyRevenue: 6300,
      totalRevenue: 37800,
      successRate: 98.0,
    },
    {
      id: 19,
      nftId: "은평 충전 허브 #1",
      dailyRevenue: 160,
      monthlyRevenue: 4800,
      totalRevenue: 28800,
      successRate: 97.6,
    },
    {
      id: 20,
      nftId: "강남 충전 허브 #3",
      dailyRevenue: 500,
      monthlyRevenue: 15000,
      totalRevenue: 90000,
      successRate: 99.5,
    },
  ];

  // 전체 통계 계산
  const totalStats = {
    totalRevenue: revenueData.reduce((sum, item) => sum + item.totalRevenue, 0),
    monthlyRevenue: revenueData.reduce(
      (sum, item) => sum + item.monthlyRevenue,
      0
    ),
    dailyRevenue: revenueData.reduce((sum, item) => sum + item.dailyRevenue, 0),
    averageRate: "+11%",
  };

  const handleRefresh = (showMessage = false) => {
    try {
      // 로딩 메시지는 showMessage가 true일 때만 표시
      if (showMessage) {
        const messageKey = "refreshMessage";
        message.loading({
          content: "데이터를 새로고침 중입니다...",
          key: messageKey,
          duration: 0,
        });
      }

      setLoading(true);

      // 데이터 새로고침 로직 (모의 구현)
      // 실제 구현에서는 서버에서 데이터를 가져오는 로직이 추가되어야 함
      setTimeout(() => {
        // 성공 메시지도 showMessage가 true일 때만 표시
        if (showMessage) {
          message.success({
            content: "새로고침 완료!",
            key: "refreshMessage",
            duration: 2,
          });
        }
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("새로고침 실패:", error);

      // 실패 메시지도 showMessage가 true일 때만 표시
      if (showMessage) {
        message.error({
          content: "데이터를 불러오는데 실패했습니다.",
          key: "refreshMessage",
          duration: 2,
        });
      }
      setLoading(false);
    }
  };

  // 초기 로딩 시 메시지 없이 데이터 가져오기
  useEffect(() => {
    // 초기 로딩 시에는 메시지를 표시하지 않음 (showMessage = false)
    handleRefresh(false);
  }, []);

  return (
    <div className="revenue-page">
      <div className="page-header">
        <h1 className="mb-6 text-5xl font-extrabold text-sky-600">수익 관리</h1>
        <StyledButton
          customVariant="primary"
          customSize="md"
          onClick={() => handleRefresh(true)} // 버튼 클릭 시에는 메시지 표시 (showMessage = true)
          icon={<ReloadOutlined />}
        >
          새로 고침
        </StyledButton>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="일일 수익"
            value={totalStats.dailyRevenue}
            prefix={<DollarOutlined />}
            suffix="PGC"
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="월간 수익"
            value={totalStats.monthlyRevenue}
            prefix={<LineChartOutlined />}
            suffix="PGC"
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="누적 수익"
            value={totalStats.totalRevenue}
            prefix={<RiseOutlined />}
            suffix="PGC"
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="평균 성공률"
            value={totalStats.averageRate}
            prefix={<CheckCircleOutlined />}
            suffix="%"
          />
        </Col>
      </Row>

      <div className="search-box">
        <StyledInput
          placeholder="수익 내역 검색..."
          prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
          customSize="md"
        />
      </div>

      <Row gutter={[16, 16]}>
        {revenueData.map((revenue) => (
          <Col key={revenue.id} xs={24} sm={12} md={8} lg={6}>
            <NFTCard
              name={revenue.nftId}
              location={`일일 수익: ${revenue.dailyRevenue} PGC`}
              chargerCount={revenue.monthlyRevenue}
              price={revenue.totalRevenue}
              status="available"
              onBuy={() => {}}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Revenue;
