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

// ICRC-3 트랜잭션 관련 타입 정의
interface ICRC3Account {
  owner: Principal;
  subaccount: [] | [Uint8Array];
}

interface ICRC3Transaction {
  kind: string;
  timestamp: bigint;
  from: [] | [ICRC3Account];
  to: [] | [ICRC3Account];
  token_ids: bigint[];
  memo: [] | [Uint8Array];
}

// ICRC-3 필터 타입 정의
interface TransactionFilter {
  date_range:
    | []
    | [
        {
          start: bigint;
          end: bigint;
        }
      ];
  account: [] | [ICRC3Account];
  type: [] | [string[]];
}

interface GetTransactionsArgs {
  start: [] | [bigint];
  length: [] | [bigint];
  account: [] | [ICRC3Account];
}

type TransactionDisplay = {
  key: string;
  type: string;
  nftId: string;
  from: string;
  to: string;
  isFromMarket: boolean;
  date: string;
};

const PAGE_SIZE = 10;

const AdminDashboard = () => {
  const [nftStats, setNftStats] = useState({
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

  const createActor = async () => {
    const authManager = AuthManager.getInstance();
    const identity = await authManager.getIdentity();

    if (!identity) {
      throw new Error("인증되지 않은 사용자입니다.");
    }

    const agent = new HttpAgent({ identity });
    if (process.env.NODE_ENV !== "production") {
      await agent.fetchRootKey();
    }

    const canisterId = process.env.CANISTER_ID_PIGGYCELL_BACKEND;
    if (!canisterId) {
      throw new Error("Canister ID를 찾을 수 없습니다.");
    }

    return Actor.createActor<_SERVICE>(idlFactory, {
      agent,
      canisterId,
    });
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

  const fetchTransactions = async (page: number) => {
    try {
      const actor = await createActor();
      const start = (page - 1) * PAGE_SIZE;

      const result = await actor.icrc3_get_transactions({
        start: [BigInt(start)],
        length: [BigInt(PAGE_SIZE)],
        account: filter.account,
      });

      // BigInt를 문자열로 변환하는 replacer 함수
      const bigIntReplacer = (key: string, value: any) => {
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      };

      console.log(
        "받은 트랜잭션 데이터:",
        JSON.stringify(result, bigIntReplacer, 2)
      );

      const formattedTransactions = (
        result.transactions as unknown as ICRC3Transaction[]
      )
        .filter((tx) => {
          if (searchText) {
            const searchLower = searchText.toLowerCase();
            return (
              tx.token_ids.some((id) => id.toString().includes(searchLower)) ||
              (tx.from?.[0]?.owner
                ?.toString()
                .toLowerCase()
                .includes(searchLower) ??
                false) ||
              (tx.to?.[0]?.owner
                ?.toString()
                .toLowerCase()
                .includes(searchLower) ??
                false)
            );
          }
          return true;
        })
        .map((tx) => {
          console.log("트랜잭션 변환 전:", tx);
          const typeMap: { [key: string]: string } = {
            mint: "NFT 발행",
            transfer: "NFT 전송",
            stake: "NFT 스테이킹",
            unstake: "NFT 언스테이킹",
            reward: "스테이킹 보상",
          };

          const backendCanisterId =
            process.env.CANISTER_ID_PIGGYCELL_BACKEND || "";
          let fromAddress = tx.from?.[0]?.owner
            ? tx.from[0].owner.toString()
            : "-";
          let toAddress = tx.to?.[0]?.owner ? tx.to[0].owner.toString() : "-";

          // 거래 유형에 따른 주소 처리
          if (tx.kind === "stake") {
            toAddress = backendCanisterId;
          } else if (tx.kind === "unstake") {
            // 언스테이킹의 경우 보내는 주소를 백엔드 컨트랙트로 설정
            const temp = fromAddress;
            fromAddress = backendCanisterId;
            toAddress = temp;
          } else if (tx.kind === "mint") {
            toAddress = backendCanisterId;
          } else if (tx.kind === "transfer") {
            // NFT 구매의 경우 보내는 주소를 백엔드 컨트랙트로 설정
            fromAddress = backendCanisterId;
          }

          const formatted = {
            key: `${tx.timestamp.toString()}`,
            type: typeMap[tx.kind] || tx.kind,
            nftId: tx.token_ids.map((id) => `#${id.toString()}`).join(", "),
            from: fromAddress,
            to: toAddress,
            isFromMarket: fromAddress === backendCanisterId,
            date: formatTimestamp(tx.timestamp),
          };
          console.log("트랜잭션 변환 후:", formatted);
          return formatted;
        });

      setTransactions(formattedTransactions);
      setTotal(Number(result.total));
    } catch (error) {
      console.error("거래 내역 조회 중 오류 발생:", error);
      message.error("거래 내역을 불러오는데 실패했습니다.");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const actor = await createActor();

        // NFT 총 발행량 조회
        const totalSupply = await actor.icrc7_total_supply();

        // 스테이킹된 NFT 수 조회
        const authManager = AuthManager.getInstance();
        const identity = await authManager.getIdentity();
        if (!identity) {
          throw new Error("인증되지 않은 사용자입니다.");
        }
        const stakedNFTs = await actor.getStakedNFTs(identity.getPrincipal());
        const stakedCount = stakedNFTs.length;

        // 활성 사용자 수 조회
        const activeUsers = await actor.getActiveUsersCount();

        // 총 거래액 조회
        const totalVolume = await actor.getTotalVolume();

        setNftStats({
          totalSupply: Number(totalSupply),
          stakedCount: stakedCount,
          activeUsers: Number(activeUsers),
          totalVolume: Number(totalVolume),
        });

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
