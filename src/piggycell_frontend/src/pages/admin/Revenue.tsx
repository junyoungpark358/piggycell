import React, { useState, useEffect } from "react";
import { Row, Col, message, Modal, Form, InputNumber } from "antd";
import {
  LineChartOutlined,
  RiseOutlined,
  SearchOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import "./Revenue.css";
import { StatCard } from "../../components/StatCard";
import { StyledTable } from "../../components/common/StyledTable";
import { StyledButton } from "../../components/common/StyledButton";
import { StyledInput } from "../../components/common/StyledInput";
import { createActor } from "../../utils/statsApi";
import { formatTokenDisplayForUI } from "../../utils/tokenUtils";

// BigInt를 안전하게 Number로 변환하는 유틸리티 함수
const toSafeNumber = (
  value: bigint | number | string | undefined | null
): number => {
  if (value === undefined || value === null) return 0;
  const numValue = typeof value === "bigint" ? Number(value) : Number(value);
  return isNaN(numValue) ? 0 : numValue;
};

// 백엔드 응답 인터페이스 정의
interface DashboardData {
  recentDistributions: RecentDistribution[];
  todayTotal: number | bigint;
  weeklyChange: number;
  activeNFTCount: number | bigint;
  pendingDistributions: number | bigint;
}

interface RecentDistribution {
  id: number | bigint;
  amount: number | bigint;
  timestamp: number | bigint;
  recipientCount: number | bigint;
}

interface DistributionStats {
  totalDistributions: number | bigint;
  totalAmountDistributed: number | bigint;
  averageDistributionAmount: number | bigint;
  lastDistributionTime: number | bigint | null;
  activeUserCount: number | bigint;
  totalNFTsRewarded: number | bigint;
}

// 수익 배분 기록을 위한 인터페이스 정의 추가
interface DistributionRecordWithDetails {
  key: string;
  id: number;
  totalAmount: number;
  distributedAt: number;
  distributedBy: string;
  recipientCount: number; // 수신자 수 (추가)
  dateFormatted: string; // 날짜 포맷팅
}

// 통계 데이터를 백엔드에서 가져오는 함수
const getRevenueStats = async () => {
  try {
    const actor = await createActor();

    // 수익 대시보드 데이터와 배분 통계 가져오기
    const dashboardData = await actor.getRevenueDashboardData();
    const distributionStats = await actor.getRevenueDistributionStats();

    console.log("수익 대시보드 데이터:", dashboardData);
    console.log("배분 통계:", distributionStats);

    // 추가 상세 로그
    console.log("==== 배분 통계 상세 로그 ====");
    console.log(
      "총 배분 횟수 (원본 값):",
      distributionStats.totalDistributions
    );
    console.log(
      "총 배분 횟수 (숫자 변환):",
      toSafeNumber(distributionStats.totalDistributions)
    );
    console.log(
      "총 배분 금액:",
      toSafeNumber(distributionStats.totalAmountDistributed)
    );
    console.log(
      "활성 사용자 수:",
      toSafeNumber(distributionStats.activeUserCount)
    );
    console.log(
      "보상 받은 NFT 수:",
      toSafeNumber(distributionStats.totalNFTsRewarded)
    );
    console.log("================================");

    // 통계 데이터 반환
    return {
      // 대시보드 데이터
      todayTotal: toSafeNumber(dashboardData.todayTotal),
      weeklyChange: dashboardData.weeklyChange,
      activeNFTCount: toSafeNumber(dashboardData.activeNFTCount),
      pendingDistributions: toSafeNumber(dashboardData.pendingDistributions),
      recentDistributions: dashboardData.recentDistributions,

      // 배분 통계
      totalDistributions: toSafeNumber(distributionStats.totalDistributions),
      totalAmountDistributed: toSafeNumber(
        distributionStats.totalAmountDistributed
      ),
      averageDistributionAmount: toSafeNumber(
        distributionStats.averageDistributionAmount
      ),
      lastDistributionTime: distributionStats.lastDistributionTime
        ? toSafeNumber(distributionStats.lastDistributionTime[0])
        : null,
      activeUserCount: toSafeNumber(distributionStats.activeUserCount),
      totalNFTsRewarded: toSafeNumber(distributionStats.totalNFTsRewarded),
    };
  } catch (error) {
    console.error("수익 통계 데이터 가져오기 실패:", error);
    message.error("수익 통계 데이터를 가져오는데 실패했습니다.");
    // 오류 발생 시 기본값 반환
    return {
      todayTotal: 0,
      weeklyChange: 0,
      activeNFTCount: 0,
      pendingDistributions: 0,
      recentDistributions: [],
      totalDistributions: 0,
      totalAmountDistributed: 0,
      averageDistributionAmount: 0,
      lastDistributionTime: null,
      activeUserCount: 0,
      totalNFTsRewarded: 0,
    };
  }
};

// getRevenueData 함수 수정 - 실제 배분 기록 가져오기
const getRevenueData = async (
  page: number,
  pageSize: number,
  searchText: string
) => {
  try {
    const actor = await createActor();
    console.log("[AdminRevenue] 수익 배분 기록 가져오기 시작");

    // 실제 모든 배분 기록 가져오기
    const distributionRecords = await actor.getAllDistributionRecords();
    console.log("[AdminRevenue] 배분 기록 조회 결과:", distributionRecords);

    // 배분 기록 변환 및 형식 지정
    const revenueData: DistributionRecordWithDetails[] = await Promise.all(
      distributionRecords.map(async (record) => {
        const recordId = toSafeNumber(record.id);

        // 나노초를 밀리초로 변환하여 날짜 생성
        const timestamp = toSafeNumber(record.distributedAt) / 1_000_000;
        const date = new Date(timestamp);

        // 날짜 포맷팅 (YYYY-MM-DD HH:MM)
        const formattedDate = date.toLocaleString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

        // 수신자 수 계산 - 백엔드 API를 사용하여 유니크한 사용자 수 가져오기
        let recipientCount;
        try {
          // 이제 백엔드에 getDistributionUniqueUserCount API가 구현되어 있어 호출 가능
          recipientCount = await actor.getDistributionUniqueUserCount(
            BigInt(recordId)
          );
          console.log(
            `[AdminRevenue] 배분 ID ${recordId}의 유니크 사용자 수: ${recipientCount}`
          );
        } catch (error) {
          console.error(
            `[AdminRevenue] 유니크 사용자 수 가져오기 실패: ${error}`
          );
          recipientCount = 0; // 오류 발생 시 기본값
        }

        return {
          key: recordId.toString(),
          id: recordId,
          totalAmount: toSafeNumber(record.totalAmount),
          distributedAt: toSafeNumber(record.distributedAt),
          distributedBy: record.distributedBy.toString(),
          recipientCount: toSafeNumber(recipientCount),
          dateFormatted: formattedDate,
        };
      })
    );

    // 검색어가 있으면 필터링
    const filteredData = searchText
      ? revenueData.filter(
          (item) =>
            item.dateFormatted.includes(searchText) ||
            item.id.toString().includes(searchText) ||
            item.distributedBy.includes(searchText)
        )
      : revenueData;

    // 최신순으로 정렬 (ID 역순)
    const sortedData = [...filteredData].sort((a, b) => b.id - a.id);

    // 페이지네이션 적용
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = sortedData.slice(startIndex, endIndex);

    return {
      revenueData: paginatedData,
      total: sortedData.length,
    };
  } catch (error) {
    console.error("수익 배분 기록 가져오기 실패:", error);
    message.error("수익 배분 기록을 가져오는데 실패했습니다.");
    return {
      revenueData: [],
      total: 0,
    };
  }
};

const AdminRevenue = () => {
  // 수익 데이터 초기값
  const initialRevenueData: DistributionRecordWithDetails[] = [];

  // 테이블 컬럼 정의 수정
  const columns = [
    {
      title: "배분 ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (id: number) => `#${id}`,
    },
    {
      title: "날짜",
      dataIndex: "dateFormatted",
      key: "dateFormatted",
      width: 200,
    },
    {
      title: "총 배분 금액",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (value: number) => `${formatTokenDisplayForUI(value)} PGC`,
      width: 200,
    },
    {
      title: "수신자 수",
      dataIndex: "recipientCount",
      key: "recipientCount",
      render: (value: number) => `${value}명`,
      width: 150,
    },
    {
      title: "배분자",
      dataIndex: "distributedBy",
      key: "distributedBy",
      render: (value: string) =>
        value.length > 15
          ? `${value.substring(0, 6)}...${value.substring(value.length - 6)}`
          : value,
      width: 200,
    },
  ];

  const [loading, setLoading] = useState(false);
  const [revenueData, setRevenueData] = useState(initialRevenueData);
  const [revenueStats, setRevenueStats] = useState({
    todayTotal: 0,
    weeklyChange: 0,
    activeNFTCount: 0,
    pendingDistributions: 0,
    totalDistributions: 0,
    totalAmountDistributed: 0,
    averageDistributionAmount: 0,
    lastDistributionTime: null as number | null,
    activeUserCount: 0,
    totalNFTsRewarded: 0,
  });
  const [totalItems, setTotalItems] = useState(0);
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
      console.log("UI에 적용될 통계 데이터:", stats);
      console.log("총 배분 횟수 (UI 적용 전):", stats.totalDistributions);
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

        // 성공적으로 배분된 후 데이터 새로고침
        fetchRevenue(1, pageSize, "", true);
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

  // 토큰 금액 표시 포맷팅 함수
  const formatTokenAmount = (amount: number) => {
    return amount / 100000000; // 8자리 소수점 고려
  };

  return (
    <div className="revenue-management">
      <div className="page-header">
        <h1 className="text-5xl font-extrabold text-sky-600">매출 관리</h1>
        <StyledButton
          customVariant="primary"
          customSize="md"
          onClick={() => fetchRevenue(1, pageSize, searchText, true)}
          icon={<ReloadOutlined />}
        >
          새로 고침
        </StyledButton>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title="활성 NFT 수"
            value={revenueStats.activeNFTCount}
            prefix={<ShoppingCartOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title="활성 사용자 수"
            value={revenueStats.activeUserCount}
            prefix={<UserOutlined />}
            suffix="명"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title="총 배분 횟수"
            value={revenueStats.totalDistributions}
            prefix={<ThunderboltOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title="총 배분 금액"
            value={formatTokenAmount(revenueStats.totalAmountDistributed)}
            prefix={<LineChartOutlined />}
            suffix="PGC"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title="평균 배분 금액"
            value={formatTokenAmount(revenueStats.averageDistributionAmount)}
            prefix={<DollarOutlined />}
            suffix="PGC"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title="마지막 배분 시간"
            value={
              revenueStats.lastDistributionTime
                ? new Date(
                    Number(revenueStats.lastDistributionTime) / 1_000_000
                  ).toLocaleString()
                : "없음"
            }
            prefix={<CalendarOutlined />}
            valueStyle={{ fontSize: "0.9rem" }}
            loading={loading}
          />
        </Col>
      </Row>

      <div className="search-box">
        <div className="search-input-wrapper">
          <StyledInput
            placeholder="배분 기록 검색..."
            prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
            customSize="md"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => fetchRevenue(1, pageSize, searchText, true)}
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

      {/* 수익 배분 기록 테이블 */}
      <h2 className="font-display text-2xl font-bold mb-4 mt-8">
        수익 배분 기록
      </h2>
      <StyledTable
        columns={columns}
        dataSource={revenueData}
        customVariant="default"
        pagination={{
          pageSize: pageSize,
          total: totalItems,
          current: currentPage,
          onChange: (page, pageSize) => {
            setCurrentPage(page);
            if (pageSize) setPageSize(pageSize);
            fetchRevenue(page, pageSize);
          },
          showTotal: (total) => `총 ${total}개의 배분 기록`,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
        }}
        loading={loading}
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
