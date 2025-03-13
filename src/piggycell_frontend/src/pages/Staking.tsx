import React from "react";
import { Row, Col, Statistic, message, Spin, Empty } from "antd";
import {
  SearchOutlined,
  BankOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
  DollarOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AuthManager } from "../utils/auth";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/piggycell_backend";
import type { _SERVICE } from "../../../declarations/piggycell_backend/piggycell_backend.did";
import "./Staking.css";
import { StatCard } from "../components/StatCard";
import { NFTCard } from "../components/NFTCard";
import { StyledInput } from "../components/common/StyledInput";
import { getStakingStats, NFTStats, createActor } from "../utils/statsApi";
import PageHeader from "../components/common/PageHeader";
import { formatTokenDisplayForUI } from "../utils/tokenUtils";

interface MetadataValue {
  Text?: string;
  Nat?: bigint;
}

type MetadataEntry = [string, MetadataValue];
type Metadata = MetadataEntry[];

interface StakedNFT {
  id: bigint;
  name: string;
  location: string;
  chargerCount: number;
  estimatedReward: bigint;
  stakedAt: bigint;
  lastRewardClaimAt: bigint;
  price: bigint;
}

const Staking = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [stakedNFTs, setStakedNFTs] = useState<StakedNFT[]>([]);
  const [stakingStats, setStakingStats] = useState<NFTStats>({
    totalSupply: 0,
    stakedCount: 0,
    activeUsers: 0,
    totalVolume: 0,
    totalChargers: 0,
    totalEstimatedRewards: BigInt(0),
  });
  const [processingNFT, setProcessingNFT] = useState<bigint | null>(null);
  const [highlightedNFT, setHighlightedNFT] = useState<string | null>(null);

  const fetchStakedNFTs = async (showMessage = false) => {
    try {
      // 로딩 메시지는 showMessage가 true일 때만 표시
      if (showMessage) {
        const messageKey = "refreshMessage";
        message.loading({
          content: "스테이킹 데이터를 새로고침 중입니다...",
          key: messageKey,
          duration: 0,
        });
      }

      setLoading(true);
      const actor = await createActor();
      const authManager = AuthManager.getInstance();
      const identity = await authManager.getIdentity();

      if (!identity) {
        return;
      }

      // 통계 데이터 가져오기
      const stats = await getStakingStats();
      setStakingStats(stats);

      // 스테이킹된 NFT 목록 조회
      const stakedTokens = await actor.getStakedNFTs(identity.getPrincipal());

      const nftDataPromises = stakedTokens.map(async (tokenId) => {
        // NFT 메타데이터 조회
        const metadata = await actor.icrc7_token_metadata([tokenId]);
        let location = "위치 정보 없음";
        let chargerCount = 0;
        let price = BigInt(0);

        if (metadata && metadata.length > 0 && metadata[0] && metadata[0][0]) {
          const metadataFields = metadata[0][0] as Array<
            [string, { Text?: string; Nat?: bigint }]
          >;
          metadataFields.forEach(([key, value]) => {
            console.log(`NFT #${tokenId} 필드:`, { key, value });

            if (key === "location" && value.Text) {
              location = value.Text;
              console.log(`위치 설정:`, location);
            } else if (key === "chargerCount" && value.Nat) {
              chargerCount = Number(value.Nat);
              console.log(`충전기 수 설정:`, chargerCount);
            } else if (key === "price" && value.Nat) {
              price = value.Nat;
              console.log(`가격 설정:`, price.toString());
            }
          });
        }

        // 스테이킹 정보 조회
        const stakingInfo = await actor.getStakingInfo(tokenId);
        if (!stakingInfo || !stakingInfo.length || !stakingInfo[0]) {
          throw new Error("스테이킹 정보를 찾을 수 없습니다.");
        }

        // 예상 보상 조회
        const estimatedReward = await actor.getEstimatedStakingReward(tokenId);
        if (!("ok" in estimatedReward)) {
          throw new Error("예상 보상을 계산할 수 없습니다.");
        }

        return {
          id: tokenId,
          name: `충전 허브 #${tokenId.toString()}`,
          location,
          chargerCount,
          estimatedReward: estimatedReward.ok,
          stakedAt: stakingInfo[0].stakedAt,
          lastRewardClaimAt: stakingInfo[0].lastRewardClaimAt,
          price,
        };
      });

      const nftData = await Promise.all(nftDataPromises);
      setStakedNFTs(nftData);

      // 성공 메시지도 showMessage가 true일 때만 표시
      if (showMessage) {
        message.success({
          content: "새로고침 완료!",
          key: "refreshMessage",
          duration: 2,
        });
      }
    } catch (error) {
      console.error("스테이킹 데이터 로딩 실패:", error);

      // 실패 메시지도 showMessage가 true일 때만 표시
      if (showMessage) {
        message.error({
          content: "스테이킹 데이터를 불러오는데 실패했습니다.",
          key: "refreshMessage",
          duration: 2,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async (nftId: bigint) => {
    try {
      setProcessingNFT(nftId);
      const actor = await createActor();
      const result = await actor.unstakeNFT(nftId);

      if ("ok" in result) {
        const reward = result.ok;
        message.success(`NFT 언스테이킹이 완료되었습니다.`);
        fetchStakedNFTs(); // 데이터 새로고침
      } else {
        message.error(`언스테이킹 실패: ${getErrorMessage(result.err)}`);
      }
    } catch (error) {
      console.error("언스테이킹 실패:", error);
      message.error("언스테이킹 중 오류가 발생했습니다.");
    } finally {
      setProcessingNFT(null);
    }
  };

  const handleClaimReward = async (nftId: bigint) => {
    try {
      setProcessingNFT(nftId);
      const actor = await createActor();
      const result = await actor.claimStakingReward(nftId);

      if ("ok" in result) {
        const reward = result.ok;
        message.success(`보상 수령이 완료되었습니다: ${reward} PGC`);
        fetchStakedNFTs(); // 데이터 새로고침
      } else {
        message.error(`보상 수령 실패: ${getErrorMessage(result.err)}`);
      }
    } catch (error) {
      console.error("보상 수령 실패:", error);
      message.error("보상 수령 중 오류가 발생했습니다.");
    } finally {
      setProcessingNFT(null);
    }
  };

  const getErrorMessage = (error: any) => {
    if (typeof error === "object" && error !== null) {
      if ("NotOwner" in error) return "NFT 소유자가 아닙니다.";
      if ("NotStaked" in error) return "스테이킹되지 않은 NFT입니다.";
      if ("TransferError" in error) return "전송 중 오류가 발생했습니다.";
    }
    return "알 수 없는 오류가 발생했습니다.";
  };

  useEffect(() => {
    // 초기 로딩 시에는 메시지를 표시하지 않음 (showMessage = false)
    fetchStakedNFTs(false);

    // URL에서 하이라이트할 NFT ID 가져오기
    const params = new URLSearchParams(location.search);
    const highlight = params.get("highlight");
    if (highlight) {
      setHighlightedNFT(highlight);
      // 3초 후에 하이라이트 효과 제거
      setTimeout(() => {
        setHighlightedNFT(null);
      }, 3000);
    }
  }, [location]);

  return (
    <div className="staking-page">
      <PageHeader title="스테이킹" onRefresh={() => fetchStakedNFTs(true)} />

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={24} sm={8} md={8}>
          <StatCard
            title="스테이킹된 NFT"
            value={stakingStats.stakedCount}
            prefix={<BankOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={8} md={8}>
          <StatCard
            title="충전기 수"
            value={stakingStats.totalChargers || 0}
            prefix={<ThunderboltOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={8} md={8}>
          <StatCard
            title="예상 보상"
            value={
              stakingStats.totalEstimatedRewards
                ? formatTokenDisplayForUI(stakingStats.totalEstimatedRewards)
                : 0
            }
            prefix={<DollarOutlined />}
            suffix="PGC"
            loading={loading}
          />
        </Col>
      </Row>

      <div className="search-box">
        <StyledInput
          placeholder="스테이킹 내역 검색..."
          prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
          customSize="md"
        />
      </div>

      {/* 스테이킹된 NFT 목록 */}
      {loading && stakedNFTs.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <Spin size="large" />
        </div>
      ) : stakedNFTs.length === 0 ? (
        <Col span={24}>
          <Empty description="스테이킹된 NFT가 없습니다." />
        </Col>
      ) : (
        <Row gutter={[16, 16]}>
          {stakedNFTs.map((nft) => (
            <Col key={nft.id.toString()} xs={24} sm={12} md={8} lg={6}>
              <NFTCard
                name={nft.name}
                location={nft.location}
                chargerCount={nft.chargerCount}
                price={nft.price}
                status="available"
                onBuy={() => handleUnstake(nft.id)}
                loading={processingNFT === nft.id}
                primaryButtonText="언스테이킹"
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default Staking;
