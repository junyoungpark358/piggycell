import { Card, Row, Col, Statistic, Table, Input, message } from "antd";
import {
  ShoppingCartOutlined,
  BankOutlined,
  UserOutlined,
  LineChartOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import "./Dashboard.css";
import { useEffect, useState } from "react";
import { Actor, HttpAgent } from "@dfinity/agent";
import { AuthManager } from "../../utils/auth";
import { idlFactory } from "../../../../declarations/piggycell_backend";
import type { _SERVICE } from "../../../../declarations/piggycell_backend/piggycell_backend.did";

interface Transaction {
  type: string;
  nftId: string | null;
  user: string;
  amount: number;
  date: string;
}

const PAGE_SIZE = 10;

const AdminDashboard = () => {
  const [nftStats, setNftStats] = useState({
    totalSupply: 0,
    stakedCount: 0,
    activeUsers: 0,
    totalVolume: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

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

  const fetchTransactions = async (page: number) => {
    try {
      const actor = await createActor();
      const result = await actor.getTransactions(
        BigInt(page - 1),
        BigInt(PAGE_SIZE)
      );

      setRecentTransactions(
        result.items.map((tx: any) => ({
          type: tx.txType,
          nftId: tx.nftId,
          user: tx.user,
          amount: Number(tx.amount),
          date: tx.date,
        }))
      );
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
        const totalSupply = await actor.icrc7_supply();

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

  const columns = [
    {
      title: "거래 유형",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "NFT ID",
      dataIndex: "nftId",
      key: "nftId",
      render: (nftId: string | null) => nftId || "-",
    },
    {
      title: "사용자",
      dataIndex: "user",
      key: "user",
      render: (user: string) => `${user.slice(0, 8)}...${user.slice(-8)}`,
    },
    {
      title: "금액",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number) => `${amount} ICP`,
    },
    {
      title: "날짜",
      dataIndex: "date",
      key: "date",
    },
  ];

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <h1 className="mb-6 text-4xl font-bold">관리자 대시보드</h1>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="총 NFT 발행량"
              value={nftStats.totalSupply}
              prefix={<ShoppingCartOutlined style={{ color: "#0284c7" }} />}
              suffix="개"
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="스테이킹된 NFT"
              value={nftStats.stakedCount}
              prefix={<BankOutlined style={{ color: "#0284c7" }} />}
              suffix="개"
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="활성 사용자"
              value={nftStats.activeUsers}
              prefix={<UserOutlined style={{ color: "#0284c7" }} />}
              suffix="명"
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="총 거래액"
              value={nftStats.totalVolume}
              prefix={<LineChartOutlined style={{ color: "#0284c7" }} />}
              suffix="ICP"
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <div className="search-box">
        <Input
          placeholder="거래 내역 검색..."
          prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
          size="middle"
        />
      </div>

      <Card className="table-card">
        <Table
          columns={columns}
          dataSource={recentTransactions}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: PAGE_SIZE,
            total: total,
            onChange: handlePageChange,
            showSizeChanger: false,
          }}
        />
      </Card>
    </div>
  );
};

export default AdminDashboard;
