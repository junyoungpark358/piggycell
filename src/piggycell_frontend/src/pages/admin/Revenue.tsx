import React, { useState, useEffect } from "react";
import { Row, Col, message, Modal, Form, InputNumber } from "antd";
import {
  LineChartOutlined,
  RiseOutlined,
  SearchOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import "./Revenue.css";
import { StatCard } from "../../components/StatCard";
import { StyledTable } from "../../components/common/StyledTable";
import { StyledButton } from "../../components/common/StyledButton";
import { StyledInput } from "../../components/common/StyledInput";
import { createActor } from "../../utils/statsApi";

// 임시 데이터를 반환하는 API 함수
const getRevenueStats = async () => {
  // 실제 구현에서는 백엔드 API를 호출
  return {
    thisMonthTotalRevenue: 271.3,
    lastMonthComparison: 12.5,
    stakingRewardsTotal: 22.7,
  };
};

const getRevenueData = async (
  page: number,
  pageSize: number,
  searchText: string
) => {
  // 실제 구현에서는 백엔드 API를 호출
  // 여기서는 임시 데이터 반환
  const tempData = [
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

  return {
    revenueData: tempData,
    total: tempData.length,
  };
};

const AdminRevenue = () => {
  // 임시 수익 데이터 초기값 정의
  const initialRevenueData = [
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
      render: (value: number) => `${value} PGC`,
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
      render: (value: number) => `${value} PGC`,
    },
  ];

  const [loading, setLoading] = useState(false);
  const [revenueData, setRevenueData] = useState(initialRevenueData);
  const [revenueStats, setRevenueStats] = useState({
    thisMonthTotalRevenue: 271.3,
    lastMonthComparison: 12.5,
    stakingRewardsTotal: 22.7,
  });
  const [totalItems, setTotalItems] = useState(2);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState("");
  const [isDistributing, setIsDistributing] = useState(false);
  const [isDistributionModalVisible, setIsDistributionModalVisible] =
    useState(false);
  const [distributionAmount, setDistributionAmount] = useState<number | null>(
    100
  );
  const [distributionForm] = Form.useForm();

  const fetchRevenue = async (
    newPage?: number,
    newPageSize?: number,
    newSearchText?: string,
    showMessage: boolean = false
  ) => {
    try {
      // 로딩 메시지는 showMessage가 true일 때만 표시
      if (showMessage) {
        const messageKey = "refreshMessage";
        message.loading({
          content: "매출 데이터를 새로고침 중입니다...",
          key: messageKey,
          duration: 0,
        });
      }

      setLoading(true);

      // 페이지 정보 설정
      const pageToFetch = newPage ?? currentPage;
      const pageSizeToUse = newPageSize ?? pageSize;
      const searchToUse =
        newSearchText !== undefined ? newSearchText : searchText;

      console.log("매출 데이터 조회 시작", {
        page: pageToFetch,
        pageSize: pageSizeToUse,
        search: searchToUse,
      });

      // 통계 데이터 로드
      const stats = await getRevenueStats();
      setRevenueStats(stats);

      // 매출 내역 로드
      const result = await getRevenueData(
        pageToFetch,
        pageSizeToUse,
        searchToUse
      );

      setRevenueData(result.revenueData);
      setTotalItems(result.total);

      // 성공 메시지도 showMessage가 true일 때만 표시
      if (showMessage) {
        message.success({
          content: "새로고침 완료!",
          key: "refreshMessage",
          duration: 2,
        });
      }
    } catch (error) {
      console.error("매출 데이터 로딩 실패:", error);

      // 실패 메시지도 showMessage가 true일 때만 표시
      if (showMessage) {
        message.error({
          content: "매출 데이터를 불러오는데 실패했습니다.",
          key: "refreshMessage",
          duration: 2,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const triggerRevenueDistribution = async (amount: number) => {
    console.log("[Revenue] 수익 배분 시작, 금액:", amount);
    setIsDistributing(true);
    try {
      console.log("[Revenue] 백엔드 액터 가져오기 시도");
      const actor = await createActor();
      console.log("[Revenue] 백엔드 액터 생성 완료");

      // PGC는 소수점 8자리를 지원하므로 금액을 10^8 배로 변환
      const amountInTokenUnits = BigInt(Math.round(amount * 100000000));
      console.log(
        "[Revenue] 변환된 금액 (토큰 단위):",
        amountInTokenUnits.toString()
      );

      console.log("[Revenue] executeDistribution 함수 호출 시작");
      // 백엔드 인터페이스가 업데이트되어 금액 전달 가능
      const result = await actor.executeDistribution(amountInTokenUnits);
      console.log("[Revenue] executeDistribution 함수 결과:", result);

      if ("ok" in result) {
        console.log("[Revenue] 수익 배분 성공");
        message.success(
          `${amount} PGC의 수익 배분이 성공적으로 완료되었습니다.`
        );
      } else {
        console.error("[Revenue] 수익 배분 실패:", result.err);
        message.error(`수익 배분 오류: ${result.err}`);
      }
    } catch (error) {
      console.error("[Revenue] 수익 배분 중 오류 발생:", error);
      console.error(
        "[Revenue] 오류 세부 정보:",
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      );
      message.error("수익 배분 중 오류가 발생했습니다.");
    } finally {
      console.log("[Revenue] 수익 배분 작업 완료");
      setIsDistributing(false);
    }
  };

  const showDistributionModal = () => {
    distributionForm.setFieldsValue({ amount: 100 });
    setIsDistributionModalVisible(true);
  };

  const handleDistributionCancel = () => {
    setIsDistributionModalVisible(false);
  };

  const handleDistributionSubmit = () => {
    distributionForm
      .validateFields()
      .then((values) => {
        const amount = values.amount;
        setIsDistributionModalVisible(false);
        triggerRevenueDistribution(amount);
      })
      .catch((info) => {
        console.log("검증 실패:", info);
      });
  };

  useEffect(() => {
    // 초기 로딩 시에는 메시지를 표시하지 않음 (showMessage = false)
    fetchRevenue(1, pageSize, "", false);
  }, []);

  return (
    <div className="revenue-management">
      <div className="page-header">
        <h1 className="text-5xl font-extrabold text-sky-600">매출 관리</h1>
        <StyledButton
          customVariant="primary"
          customSize="md"
          onClick={() => fetchRevenue(1, pageSize, searchText, true)} // 버튼 클릭 시에는 메시지 표시 (showMessage = true)
          icon={<ReloadOutlined />}
        >
          새로 고침
        </StyledButton>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={8} md={8}>
          <StatCard
            title="이번 달 총 수익"
            value={revenueStats.thisMonthTotalRevenue}
            prefix={<LineChartOutlined />}
            suffix="PGC"
          />
        </Col>
        <Col xs={12} sm={8} md={8}>
          <StatCard
            title="전월 대비"
            value={revenueStats.lastMonthComparison}
            prefix={<RiseOutlined />}
            suffix="%"
            valueStyle={{ color: "#3f8600" }}
          />
        </Col>
        <Col xs={12} sm={8} md={8}>
          <StatCard
            title="스테이킹 보상 지급액"
            value={revenueStats.stakingRewardsTotal}
            prefix={<LineChartOutlined />}
            suffix="PGC"
          />
        </Col>
      </Row>

      <div className="search-box">
        <div className="search-input-wrapper">
          <StyledInput
            placeholder="수익 내역 검색..."
            prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
            customSize="md"
          />
        </div>
        <div className="action-wrapper">
          <StyledButton
            customVariant="primary"
            customSize="md"
            onClick={showDistributionModal}
            loading={isDistributing}
            icon={<ThunderboltOutlined />}
          >
            수익 배분하기
          </StyledButton>
        </div>
      </div>

      <StyledTable
        columns={columns}
        dataSource={revenueData}
        customVariant="default"
        pagination={{ pageSize: 10 }}
      />

      {/* 수익 배분 모달 */}
      <Modal
        title="수익 배분하기"
        open={isDistributionModalVisible}
        onCancel={handleDistributionCancel}
        footer={[
          <StyledButton
            key="cancel"
            customVariant="ghost"
            customColor="primary"
            onClick={handleDistributionCancel}
          >
            취소
          </StyledButton>,
          <StyledButton
            key="submit"
            customVariant="primary"
            customColor="primary"
            loading={isDistributing}
            onClick={handleDistributionSubmit}
          >
            배분하기
          </StyledButton>,
        ]}
      >
        <Form form={distributionForm} layout="vertical">
          <Form.Item
            name="amount"
            label="배분할 수익 (PGC)"
            rules={[
              { required: true, message: "수익 금액을 입력해주세요" },
              {
                type: "number",
                min: 0.00000001,
                message: "0보다 큰 값을 입력해주세요",
              },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="배분할 수익 입력 (예: 100)"
              precision={8} // 소수점 8자리까지 지원
              step={0.1}
              stringMode // 큰 소수점 값을 정확하게 처리하기 위해
            />
          </Form.Item>
          <p className="text-gray-500 text-sm">
            입력한 금액이 스테이킹한 NFT 소유자들에게 분배됩니다. 소수점
            8자리까지 입력 가능합니다.
          </p>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminRevenue;
