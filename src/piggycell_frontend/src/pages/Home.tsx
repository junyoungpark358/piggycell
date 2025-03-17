import { Row, Col, Tabs, Empty } from "antd";
import {
  ThunderboltOutlined,
  ShoppingCartOutlined,
  BankOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthManager } from "../utils/auth";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/piggycell_backend";
import type { _SERVICE } from "../../../declarations/piggycell_backend/piggycell_backend.did";
import "./Home.css";
import { message } from "antd";
import { NFTCard } from "../components/NFTCard";
import { StatCard } from "../components/StatCard";
import PageHeader from "../components/common/PageHeader";
import { getUserNFTs, NFTData, createActor } from "../utils/statsApi";
import { formatTokenDisplayForUI } from "../utils/tokenUtils";

interface MetadataValue {
  Text?: string;
  Nat?: bigint;
}

type MetadataEntry = [string, MetadataValue];
type Metadata = MetadataEntry[];

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ownedNFTs, setOwnedNFTs] = useState<NFTData[]>([]);
  const [stakedNFTs, setStakedNFTs] = useState<NFTData[]>([]);
  const [stakingInProgress, setStakingInProgress] = useState<bigint | null>(
    null
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("owned");
  const [stats, setStats] = useState({
    ownedCount: 0,
    stakedCount: 0,
    totalChargerCount: 0,
    estimatedMonthlyRevenue: 0,
  });

  const fetchNFTs = async (showMessage = false) => {
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

      // statsApi의 getUserNFTs 함수 사용
      const userData = await getUserNFTs();

      console.log("새로고침 데이터 받음:", {
        ownedNFTs: userData.ownedNFTs.length,
        stakedNFTs: userData.stakedNFTs.length,
        stats: userData.stats,
      });

      // 상태 업데이트 전에 현재 상태 로깅
      console.log("현재 상태:", {
        ownedNFTs: ownedNFTs.length,
        stakedNFTs: stakedNFTs.length,
        stats,
      });

      setOwnedNFTs([...userData.ownedNFTs]);
      setStakedNFTs([...userData.stakedNFTs]);
      setStats({ ...userData.stats });

      // 성공 메시지도 showMessage가 true일 때만 표시
      if (showMessage) {
        message.success({
          content: "새로고침 완료!",
          key: "refreshMessage",
          duration: 2,
        });
      }
    } catch (error) {
      console.error("NFT 데이터 로딩 실패:", error);

      // 실패 메시지도 showMessage가 true일 때만 표시
      if (showMessage) {
        message.error({
          content: "NFT 데이터를 불러오는데 실패했습니다.",
          key: "refreshMessage",
          duration: 2,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 인증 상태 확인 함수
  const checkAuthentication = async () => {
    const authManager = AuthManager.getInstance();
    const identity = await authManager.getIdentity();
    const authenticated = !!identity;
    setIsAuthenticated(authenticated);
    return authenticated;
  };

  const handleStake = async (nftId: bigint) => {
    try {
      setStakingInProgress(nftId);
      const actor = await createActor();
      const result = await actor.stakeNFT(BigInt(nftId.toString()));

      if ("ok" in result) {
        message.success("NFT 스테이킹이 완료되었습니다.");
        // NFT 목록 새로고침
        fetchNFTs(false);
      } else {
        message.error(`스테이킹 실패: ${getErrorMessage(result.err)}`);
      }
    } catch (error) {
      console.error("스테이킹 실패:", error);
      message.error("스테이킹 중 오류가 발생했습니다.");
    } finally {
      setStakingInProgress(null);
    }
  };

  const handleUnstake = async (nftId: bigint) => {
    try {
      setStakingInProgress(nftId);
      const actor = await createActor();
      const result = await actor.unstakeNFT(BigInt(nftId.toString()));

      if ("ok" in result) {
        const reward = result.ok;
        message.success(`NFT 언스테이킹이 완료되었습니다.`);
        // NFT 목록 새로고침
        fetchNFTs(false);
      } else {
        message.error(`언스테이킹 실패: ${getErrorMessage(result.err)}`);
      }
    } catch (error) {
      console.error("언스테이킹 실패:", error);
      message.error("언스테이킹 중 오류가 발생했습니다.");
    } finally {
      setStakingInProgress(null);
    }
  };

  const getErrorMessage = (error: any) => {
    if (typeof error === "object" && error !== null) {
      if ("NotOwner" in error) return "NFT 소유자가 아닙니다.";
      if ("AlreadyStaked" in error) return "이미 스테이킹된 NFT입니다.";
      if ("NotStaked" in error) return "스테이킹되지 않은 NFT입니다.";
      if ("TransferError" in error) return "전송 중 오류가 발생했습니다.";
    }
    return "알 수 없는 오류가 발생했습니다.";
  };

  useEffect(() => {
    // 인증 상태 확인
    checkAuthentication();
    // 초기 데이터 로딩
    fetchNFTs();
  }, []);

  return (
    <div className="home-page">
      <PageHeader title="PiggyCell" onRefresh={() => fetchNFTs(true)} />

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="보유 중인 NFT"
            value={stats.ownedCount}
            prefix={<ShoppingCartOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="스테이킹 중인 NFT"
            value={stats.stakedCount}
            prefix={<BankOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 충전기"
            value={stats.totalChargerCount}
            prefix={<ThunderboltOutlined />}
            suffix="대"
            loading={loading}
          />
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        items={[
          {
            key: "owned",
            label: `보유 중인 NFT (${ownedNFTs.length})`,
            children: (
              <Row gutter={[16, 16]}>
                {ownedNFTs.length > 0 ? (
                  ownedNFTs.map((nft) => (
                    <Col key={nft.id.toString()} xs={24} sm={12} md={8} lg={6}>
                      <NFTCard
                        name={nft.name}
                        location={nft.location}
                        chargerCount={nft.chargerCount}
                        price={nft.price}
                        status="available"
                        onBuy={() => handleStake(nft.id)}
                        loading={stakingInProgress === nft.id}
                        primaryButtonText="스테이킹"
                        isAuthenticated={isAuthenticated}
                      />
                    </Col>
                  ))
                ) : (
                  <Col span={24}>
                    <Empty description="보유 중인 NFT가 없습니다." />
                  </Col>
                )}
              </Row>
            ),
          },
          {
            key: "staked",
            label: `스테이킹 중인 NFT (${stakedNFTs.length})`,
            children: (
              <Row gutter={[16, 16]}>
                {stakedNFTs.length > 0 ? (
                  stakedNFTs.map((nft) => (
                    <Col key={nft.id.toString()} xs={24} sm={12} md={8} lg={6}>
                      <NFTCard
                        name={nft.name}
                        location={nft.location}
                        chargerCount={nft.chargerCount}
                        price={nft.price}
                        status="available"
                        onBuy={() => handleUnstake(nft.id)}
                        loading={stakingInProgress === nft.id}
                        primaryButtonText="언스테이킹"
                        isAuthenticated={isAuthenticated}
                      />
                    </Col>
                  ))
                ) : (
                  <Col span={24}>
                    <Empty description="스테이킹 중인 NFT가 없습니다." />
                  </Col>
                )}
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
};

export default Home;
