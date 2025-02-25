import { Row, Col, message, Tooltip } from "antd";
import {
  ShoppingCartOutlined,
  BankOutlined,
  UserOutlined,
  LineChartOutlined,
  SearchOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import "./Dashboard.css";
import { useEffect, useState } from "react";
import { Actor, HttpAgent } from "@dfinity/agent";
import { AuthManager } from "../../utils/auth";
import { idlFactory } from "../../../../declarations/piggycell_backend";
import type { _SERVICE } from "../../../../declarations/piggycell_backend/piggycell_backend.did";
import { Principal } from "@dfinity/principal";
import { StatCard } from "../../components/StatCard";
import { StyledTable } from "../../components/common/StyledTable";
import { StyledButton } from "../../components/common/StyledButton";
import { StyledInput } from "../../components/common/StyledInput";
import {
  getAdminDashboardStats,
  NFTStats,
  getTransactions,
  TransactionDisplay,
  TransactionFilter,
  ICRC3Account,
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

  const fetchTransactions = async (page: number) => {
    try {
      // statsApi의 getTransactions 함수 사용
      const result = await getTransactions(page, PAGE_SIZE, filter, searchText);
      setTransactions(result.transactions);
      setTotal(result.total);
    } catch (error) {
      console.error("거래 내역 조회 중 오류 발생:", error);
      message.error("거래 내역을 불러오는데 실패했습니다.");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 새로운 모듈화된 API 사용
        const stats = await getAdminDashboardStats();
        setNftStats(stats);

        // 거래 내역 조회
        await fetchTransactions(currentPage);
      } catch (error) {
        console.error("데이터 조회 중 오류 발생:", error);
        message.error("데이터를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 검색 핸들러
  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: "거래 유형",
      dataIndex: "type",
      key: "type",
      align: "center" as const,
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: "NFT ID",
      dataIndex: "nftId",
      key: "nftId",
      align: "center" as const,
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: "보내는 주소",
      dataIndex: "from",
      key: "from",
      align: "center" as const,
      render: (text: string) => renderAddress(text, "보내는 주소"),
    },
    {
      title: "받는 주소",
      dataIndex: "to",
      key: "to",
      align: "center" as const,
      render: (text: string) => renderAddress(text, "받는 주소"),
    },
    {
      title: "날짜",
      dataIndex: "date",
      key: "date",
      align: "center" as const,
      render: (text: string) => <span>{text}</span>,
    },
  ];

  const handleRefresh = async () => {
    await fetchTransactions(currentPage);
  };

  // 타임스탬프를 한국 시간 문자열로 변환하는 함수
  const formatTimestamp = (timestamp: bigint): string => {
    // 나노초를 밀리초로 변환 (1 밀리초 = 1,000,000 나노초)
    const milliseconds = Number(timestamp) / 1_000_000;
    const date = new Date(milliseconds);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(date);
  };

  // Principal을 문자열로 변환하고 축약하는 함수
  const formatPrincipal = (principal: Principal | undefined): string => {
    if (!principal) return "-";
    const text = principal.toString();
    return text.length > 10 ? `${text.slice(0, 5)}...${text.slice(-5)}` : text;
  };

  // 주소 축약 함수 추가
  const shortenAddress = (address: string) => {
    if (address === "-") return "-";
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
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

  // 주소 렌더링 컴포넌트 수정
  const renderAddress = (text: string, label: string) => {
    if (text === "-") return "-";
    return (
      <div className="address-display">
        <Tooltip title={text}>
          <span>{shortenAddress(text)}</span>
        </Tooltip>
        <Tooltip title={`${label} 복사`}>
          <StyledButton
            customVariant="ghost"
            customSize="xs"
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(text)}
          />
        </Tooltip>
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <h1 className="mb-6 text-4xl font-bold">관리자 대시보드</h1>
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
            title="활성 사용자"
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
          />
        </Col>
      </Row>

      <div className="mb-4 search-box">
        <div className="search-input-wrapper">
          <StyledInput
            placeholder="검색..."
            prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
            customSize="md"
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <StyledButton
          customVariant="primary"
          customColor="primary"
          onClick={handleRefresh}
          icon={<SearchOutlined />}
        >
          새로고침
        </StyledButton>
      </div>

      <StyledTable
        columns={columns}
        dataSource={transactions}
        loading={loading}
        customVariant="compact"
        pagination={{
          current: currentPage,
          pageSize: PAGE_SIZE,
          total: total,
          onChange: handlePageChange,
        }}
      />
    </div>
  );
};

export default AdminDashboard;
