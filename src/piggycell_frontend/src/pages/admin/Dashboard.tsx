import { Col, Row, Tag, message, Tooltip, Modal, Form } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import {
  CopyOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  BankOutlined,
  UserOutlined,
  LineChartOutlined,
  PlusOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
} from "@ant-design/icons";
import type { FilterValue, SorterResult } from "antd/es/table/interface";
import "./Dashboard.css";
import { StatCard } from "../../components/StatCard";
import { StyledTable } from "../../components/common/StyledTable";
import { StyledButton } from "../../components/common/StyledButton";
import { StyledInput } from "../../components/common/StyledInput";
import { formatPGCBalance } from "../../utils/tokenUtils";

import {
  getBasicNFTStats,
  getMarketStats,
  getStakingStats,
  getAdminDashboardStats,
  getTransactions,
  ICRC3Transaction,
  ICRC3Account,
  TransactionFilter,
  TransactionDisplay,
  NFTStats,
  addAdmin,
  removeAdmin,
} from "../../utils/statsApi";

// ICRC-3 트랜잭션 관련 타입 정의
// 이미 statsApi.ts에서 가져온 타입을 사용하므로 여기서는 정의하지 않음

// ICRC-3 필터 타입 정의
// 이미 statsApi.ts에서 가져온 TransactionFilter를 사용하므로 여기서는 정의하지 않음

interface GetTransactionsArgs {
  start: [] | [bigint];
  length: [] | [bigint];
  account: [] | [ICRC3Account];
}

const PAGE_SIZE = 10;

const AdminDashboard = () => {
  const [nftStats, setNftStats] = useState<NFTStats>({
    totalSupply: 0,
    stakedCount: 0,
    activeUsers: 0,
    totalVolume: 0,
  });
  const [transactions, setTransactions] = useState<TransactionDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<TransactionFilter>({
    date_range: [],
    account: [],
    type: [],
  });
  const [searchText, setSearchText] = useState("");
  const [searchTimer, setSearchTimer] = useState<any>(null);

  // 관리자 추가 모달 상태
  const [isAddAdminModalVisible, setIsAddAdminModalVisible] = useState(false);
  const [adminPrincipalId, setAdminPrincipalId] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);

  // 관리자 삭제 모달 상태
  const [isRemoveAdminModalVisible, setIsRemoveAdminModalVisible] =
    useState(false);
  const [removeAdminPrincipalId, setRemoveAdminPrincipalId] = useState("");
  const [removingAdmin, setRemovingAdmin] = useState(false);

  const [form] = Form.useForm();
  const [removeAdminForm] = Form.useForm();

  // 검색 핸들러 수정 - 타이머 추가
  const handleSearch = async (value: string) => {
    try {
      console.log(`[DEBUG] 검색 시작: 검색어 = "${value}"`);
      setLoading(true); // 로딩 시작
      setCurrentPage(1); // 첫 페이지로 이동
      setSearchText(value); // 검색어 상태 업데이트

      // 직접 value를 전달하여 API 호출 - searchText 상태에 의존하지 않음
      console.log(`[DEBUG] fetchTransactions 호출 준비: value="${value}"`);
      await fetchTransactions(1, filter, value, false);
      console.log(`[DEBUG] 검색 완료: 검색어 = "${value}"`);
    } catch (error) {
      console.error("[ERROR] 검색 중 오류 발생:", error);
      message.error("검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false); // 로딩 종료
    }
  };

  // 검색어 입력 처리 함수 추가
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log(`[DEBUG] 검색어 입력 변경: "${value}"`);

    // 기존 타이머가 있으면 취소
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    // 검색 텍스트 상태 즉시 업데이트 (UI 반영용)
    setSearchText(value);

    // 300ms 후에 검색 실행 (디바운스)
    const timer = setTimeout(() => {
      console.log(`[DEBUG] 디바운스 후 검색 실행: "${value}"`);
      handleSearch(value);
    }, 300);

    setSearchTimer(timer);
  };

  const fetchTransactions = async (
    newPage?: number,
    newFilter?: TransactionFilter,
    newSearchText?: string,
    showMessage: boolean = true
  ) => {
    try {
      const pageToFetch = newPage ?? currentPage;
      const filterToUse = newFilter ?? filter;
      const searchToUse =
        newSearchText !== undefined ? newSearchText : searchText;

      // 검색어 로그 형식 개선 - 따옴표 없이 실제 값 표시
      console.log(`[DEBUG] fetchTransactions 실행:`, {
        pageToFetch,
        filterToUse,
        searchToUse,
        showMessage,
      });

      // 로딩 상태 표시
      const messageKey = "loadingTransactions";
      if (showMessage) {
        message.loading({
          content: "거래 내역을 불러오는 중...",
          key: messageKey,
          duration: 0,
        });
      }

      // 개선된 getTransactions 함수 사용 (정렬은 기본값으로 고정)
      console.log(`[DEBUG] getTransactions API 호출 직전:`, {
        page: pageToFetch,
        pageSize: PAGE_SIZE,
        filter: filterToUse,
        searchText: searchToUse,
      });

      const result = await getTransactions(
        pageToFetch,
        PAGE_SIZE,
        filterToUse,
        searchToUse,
        "date", // 항상 날짜 기준
        "descend" // 항상 내림차순
      );

      console.log(`[DEBUG] API 응답 결과:`, {
        total: result.total,
        transactionsCount: result.transactions.length,
        firstTransaction:
          result.transactions.length > 0 ? result.transactions[0] : "없음",
      });

      // 데이터 업데이트
      setTransactions(result.transactions);
      setTotal(result.total);

      // 성공 메시지 (showMessage가 true일 때만 표시)
      if (showMessage) {
        message.success({
          content: "거래 내역을 불러왔습니다.",
          key: messageKey,
          duration: 1,
        });
      }
    } catch (error) {
      console.error("[ERROR] 거래 내역 불러오기 오류:", error);

      // 오류 메시지
      message.error({
        content: "거래 내역을 불러오는 중 오류가 발생했습니다.",
        key: "loadingTransactions",
        duration: 1,
      });
    }
  };

  // 첫 로딩 시 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("[DEBUG] 초기 데이터 로딩 시작");
        setLoading(true);

        // 새로운 모듈화된 API 사용
        const stats = await getAdminDashboardStats();
        setNftStats(stats);

        // 거래 내역 조회 (showMessage=false로 설정하여 초기 로딩 메시지 숨김)
        await fetchTransactions(1, filter, "", false);
        console.log("[DEBUG] 초기 데이터 로딩 완료");
      } catch (error) {
        console.error("[ERROR] 초기 데이터 로딩 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 페이지 변경 시 데이터 다시 로드 (검색어 의존성 명시적으로 제거)
  useEffect(() => {
    // 첫 로딩 시에는 이미 데이터를 가져오므로 스킵
    if (loading && transactions.length === 0) {
      console.log("[DEBUG] 초기 로딩 중이므로 페이지 변경 효과 무시");
      return;
    }

    console.log(`[DEBUG] 페이지 변경: ${currentPage} - 데이터 다시 로드`);

    setLoading(true);
    // 페이지 변경 시 현재 검색어와 필터 유지하면서 데이터 로드
    fetchTransactions(currentPage, filter, searchText, false)
      .catch((error) => {
        console.error("[ERROR] 페이지 변경 중 오류 발생:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentPage]); // 페이지 변경 시에만 실행, filter와 searchText 의존성 제거

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 테이블 변경 핸들러 - 페이지네이션만 처리
  const handleTableChange = (
    pagination: any,
    filters: Record<string, FilterValue | null>,
    sorter:
      | SorterResult<TransactionDisplay>
      | SorterResult<TransactionDisplay>[]
  ) => {
    console.log(
      `[DEBUG] 테이블 변경: 현재 페이지 ${currentPage}, 새 페이지 ${pagination.current}`
    );

    // 페이지 변경
    if (pagination.current !== currentPage) {
      console.log(
        `[DEBUG] 페이지 변경: ${currentPage} → ${pagination.current}`
      );
      setCurrentPage(pagination.current);
    }
  };

  // 새로고침 핸들러 개선
  const handleRefresh = async () => {
    const messageKey = "refreshing";
    try {
      console.log("[DEBUG] 새로고침 시작");
      message.loading({
        content: "데이터를 새로고침 중입니다...",
        key: messageKey,
        duration: 0,
      });

      setLoading(true);

      // 검색어 초기화
      if (searchText) {
        console.log("[DEBUG] 검색어 초기화");
        setSearchText("");
      }

      // 첫 페이지로 리셋
      setCurrentPage(1);

      // 모든 상태를 초기화하고 데이터 다시 로드 (검색어 null로 전달)
      console.log("[DEBUG] 트랜잭션 새로고침 (검색어 없음)");
      await fetchTransactions(1, filter, "", false);

      // NFT 통계 새로고침
      console.log("[DEBUG] 통계 데이터 새로고침");
      const stats = await getAdminDashboardStats();
      setNftStats(stats);

      // 성공 메시지
      message.success({
        content: "새로고침 완료!",
        key: messageKey,
        duration: 1,
      });
      console.log("[DEBUG] 새로고침 완료");
    } catch (error) {
      console.error("[ERROR] 새로고침 중 오류 발생:", error);
      message.error({
        content: "새로고침 실패!",
        key: messageKey,
        duration: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  // 관리자 추가 모달 표시
  const showAddAdminModal = () => {
    setIsAddAdminModalVisible(true);
  };

  // 관리자 추가 모달 닫기
  const handleAddAdminCancel = () => {
    setIsAddAdminModalVisible(false);
    setAdminPrincipalId("");
    form.resetFields();
  };

  // 관리자 추가 처리
  const handleAddAdmin = async () => {
    try {
      if (!adminPrincipalId.trim()) {
        message.error("관리자 Principal ID를 입력해주세요.");
        return;
      }

      setAddingAdmin(true);
      message.loading({
        content: "관리자를 추가하는 중...",
        key: "addAdmin",
        duration: 0,
      });

      // 관리자 추가 API 호출
      const result = await addAdmin(adminPrincipalId);

      if (result.ok) {
        message.success({
          content: "관리자가 성공적으로 추가되었습니다.",
          key: "addAdmin",
          duration: 1,
        });
        handleAddAdminCancel();
      } else {
        message.error({
          content: `관리자 추가 실패: ${result.err}`,
          key: "addAdmin",
          duration: 1,
        });
      }
    } catch (error) {
      console.error("[ERROR] 관리자 추가 중 오류 발생:", error);
      message.error({
        content: "관리자 추가 중 오류가 발생했습니다.",
        key: "addAdmin",
        duration: 1,
      });
    } finally {
      setAddingAdmin(false);
    }
  };

  // 관리자 삭제 모달 표시
  const showRemoveAdminModal = () => {
    setIsRemoveAdminModalVisible(true);
  };

  // 관리자 삭제 모달 닫기
  const handleRemoveAdminCancel = () => {
    setIsRemoveAdminModalVisible(false);
    setRemoveAdminPrincipalId("");
    removeAdminForm.resetFields();
  };

  // 관리자 삭제 처리
  const handleRemoveAdmin = async () => {
    try {
      if (!removeAdminPrincipalId.trim()) {
        message.error("삭제할 관리자 Principal ID를 입력해주세요.");
        return;
      }

      setRemovingAdmin(true);
      message.loading({
        content: "관리자를 삭제하는 중...",
        key: "removeAdmin",
        duration: 0,
      });

      // 관리자 삭제 API 호출
      const result = await removeAdmin(removeAdminPrincipalId);

      if (result.ok) {
        message.success({
          content: "관리자가 성공적으로 삭제되었습니다.",
          key: "removeAdmin",
          duration: 1,
        });
        handleRemoveAdminCancel();
      } else {
        message.error({
          content: `관리자 삭제 실패: ${result.err}`,
          key: "removeAdmin",
          duration: 1,
        });
      }
    } catch (error) {
      console.error("[ERROR] 관리자 삭제 중 오류 발생:", error);
      message.error({
        content: "관리자 삭제 중 오류가 발생했습니다.",
        key: "removeAdmin",
        duration: 1,
      });
    } finally {
      setRemovingAdmin(false);
    }
  };

  // 테이블 정의
  const columns: ColumnsType<TransactionDisplay> = [
    {
      title: "거래 유형",
      dataIndex: "type",
      key: "type",
      render: (text) => {
        let color = "default";
        if (text === "NFT 발행") color = "blue";
        else if (text === "NFT 전송") color = "green";
        else if (text === "NFT 스테이킹") color = "purple";
        else if (text === "NFT 언스테이킹") color = "volcano";
        else if (text === "스테이킹 보상") color = "gold";
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "NFT ID",
      dataIndex: "nftId",
      key: "nftId",
    },
    {
      title: "발신자",
      dataIndex: "from",
      key: "from",
      render: (text) => renderAddress(text),
    },
    {
      title: "수신자",
      dataIndex: "to",
      key: "to",
      render: (text) => renderAddress(text),
    },
    {
      title: "일시",
      dataIndex: "date",
      key: "date",
    },
  ];

  // 주소를 표시하고 복사하는 함수
  const renderAddress = (address: string, label?: string) => {
    if (!address || address === "-") return <span>-</span>;

    const truncatedAddress = `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;

    return (
      <div className="address-display">
        <Tooltip title={`${label ? label : "주소"}: ${address}`}>
          <span>{truncatedAddress}</span>
        </Tooltip>
        <Tooltip title="주소 복사">
          <StyledButton
            customVariant="ghost"
            customSize="sm"
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(address)}
          />
        </Tooltip>
      </div>
    );
  };

  // 클립보드 복사 함수 추가
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        message.success("주소가 복사되었습니다.");
      },
      (err) => {
        message.error("주소 복사에 실패했습니다.");
        console.error("복사 실패:", err);
      }
    );
  };

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <h1>대시보드</h1>
        <StyledButton
          customVariant="primary"
          customColor="primary"
          onClick={handleRefresh}
          icon={<ReloadOutlined />}
        >
          새로 고침
        </StyledButton>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 NFT"
            value={nftStats.totalSupply}
            prefix={<ShoppingCartOutlined style={{ color: "#0284c7" }} />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="스테이킹된 NFT"
            value={nftStats.stakedCount}
            prefix={<BankOutlined style={{ color: "#0284c7" }} />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="NFT 소유자"
            value={nftStats.activeUsers}
            prefix={<UserOutlined style={{ color: "#0284c7" }} />}
            suffix="명"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 거래량"
            value={nftStats.totalVolume}
            prefix={<LineChartOutlined style={{ color: "#0284c7" }} />}
            suffix="PGC"
            loading={loading}
            formatter={(value) => formatPGCBalance(value)}
          />
        </Col>
      </Row>

      <div className="search-box">
        <div className="search-input-wrapper">
          <StyledInput
            placeholder="NFT ID 또는 주소로 검색"
            prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
            customSize="md"
            value={searchText}
            onChange={handleSearchInputChange}
          />
        </div>
        <div className="admin-buttons">
          <StyledButton
            customVariant="primary"
            customColor="primary"
            onClick={showAddAdminModal}
            icon={<UserAddOutlined />}
          >
            관리자 추가
          </StyledButton>
          <StyledButton
            customVariant="primary"
            customColor="error"
            onClick={showRemoveAdminModal}
            icon={<UserDeleteOutlined />}
          >
            관리자 삭제
          </StyledButton>
        </div>
      </div>

      <StyledTable
        columns={columns}
        dataSource={transactions}
        loading={loading}
        rowKey="key"
        customVariant="bordered"
        pagination={{
          current: currentPage,
          pageSize: PAGE_SIZE,
          total: total,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          showTotal: (total) => `총 ${total}개 거래`,
        }}
        onChange={handleTableChange}
      />

      {/* 관리자 추가 모달 */}
      <Modal
        title="관리자 추가"
        open={isAddAdminModalVisible}
        onCancel={handleAddAdminCancel}
        className="admin-modal"
        footer={[
          <StyledButton
            key="cancel"
            customVariant="ghost"
            customColor="primary"
            onClick={handleAddAdminCancel}
          >
            취소
          </StyledButton>,
          <StyledButton
            key="submit"
            customVariant="primary"
            customColor="primary"
            loading={addingAdmin}
            onClick={handleAddAdmin}
          >
            추가
          </StyledButton>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          name="addAdminForm"
          className="admin-form"
          requiredMark={false}
        >
          <Form.Item
            name="principalId"
            label="관리자 Principal ID"
            rules={[
              {
                required: true,
                message: "관리자 Principal ID를 입력해주세요.",
              },
              {
                pattern: /^[a-zA-Z0-9\-]+$/,
                message: "유효한 Principal ID 형식이 아닙니다.",
              },
            ]}
          >
            <StyledInput
              placeholder="새 관리자의 Principal ID를 입력하세요"
              value={adminPrincipalId}
              onChange={(e) => setAdminPrincipalId(e.target.value)}
              customSize="md"
              noRotate={true}
            />
          </Form.Item>
          <p className="form-description">
            관리자 추가는 슈퍼 관리자만 수행할 수 있습니다.
          </p>
        </Form>
      </Modal>

      {/* 관리자 삭제 모달 */}
      <Modal
        title="관리자 삭제"
        open={isRemoveAdminModalVisible}
        onCancel={handleRemoveAdminCancel}
        className="admin-modal"
        footer={[
          <StyledButton
            key="cancel"
            customVariant="ghost"
            customColor="primary"
            onClick={handleRemoveAdminCancel}
          >
            취소
          </StyledButton>,
          <StyledButton
            key="submit"
            customVariant="primary"
            customColor="error"
            loading={removingAdmin}
            onClick={handleRemoveAdmin}
          >
            삭제
          </StyledButton>,
        ]}
      >
        <Form
          form={removeAdminForm}
          layout="vertical"
          name="removeAdminForm"
          className="admin-form"
          requiredMark={false}
        >
          <Form.Item
            name="principalId"
            label="삭제할 관리자 Principal ID"
            rules={[
              {
                required: true,
                message: "삭제할 관리자 Principal ID를 입력해주세요.",
              },
              {
                pattern: /^[a-zA-Z0-9\-]+$/,
                message: "유효한 Principal ID 형식이 아닙니다.",
              },
            ]}
          >
            <StyledInput
              placeholder="삭제할 관리자의 Principal ID를 입력하세요"
              value={removeAdminPrincipalId}
              onChange={(e) => setRemoveAdminPrincipalId(e.target.value)}
              customSize="md"
              noRotate={true}
            />
          </Form.Item>
          <p className="form-description">
            관리자 삭제는 슈퍼 관리자만 수행할 수 있습니다. 이 작업은 되돌릴 수
            없습니다.
          </p>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
