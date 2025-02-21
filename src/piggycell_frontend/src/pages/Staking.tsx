import React from "react";
import { Row, Col, Input, Statistic, message, Spin, Empty } from "antd";
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
import { StyledButton } from "../components/common/StyledButton";

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
}

const Staking = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [stakedNFTs, setStakedNFTs] = useState<StakedNFT[]>([]);
  const [totalStakedNFTs, setTotalStakedNFTs] = useState(0);
  const [totalChargers, setTotalChargers] = useState(0);
  const [totalEstimatedRewards, setTotalEstimatedRewards] = useState<bigint>(
    BigInt(0)
  );
  const [processingNFT, setProcessingNFT] = useState<bigint | null>(null);
  const [highlightedNFT, setHighlightedNFT] = useState<string | null>(null);

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

  const fetchStakedNFTs = async () => {
    try {
      setLoading(true);
      const actor = await createActor();
      const authManager = AuthManager.getInstance();
      const identity = await authManager.getIdentity();

      if (!identity) {
        return;
      }

      // 스테이킹된 NFT 목록 조회
      const stakedTokens = await actor.getStakedNFTs(identity.getPrincipal());

      const nftDataPromises = stakedTokens.map(async (tokenId) => {
        // NFT 메타데이터 조회
        const metadata = await actor.icrc7_token_metadata([tokenId]);
        let location = "위치 정보 없음";
        let chargerCount = 0;

        if (metadata && metadata.length > 0 && metadata[0]) {
          const metadataEntries = metadata[0] as Metadata;
          for (const [key, value] of metadataEntries) {
            if (key === "location" && value.Text) {
              location = value.Text;
            } else if (key === "chargerCount" && value.Nat) {
              chargerCount = Number(value.Nat);
            }
          }
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
        };
      });

      const nftData = await Promise.all(nftDataPromises);
      setStakedNFTs(nftData);

      // 통계 업데이트
      setTotalStakedNFTs(nftData.length);
      setTotalChargers(nftData.reduce((sum, nft) => sum + nft.chargerCount, 0));
      setTotalEstimatedRewards(
        nftData.reduce((sum, nft) => sum + nft.estimatedReward, BigInt(0))
      );
    } catch (error) {
      console.error("스테이킹 데이터 로딩 실패:", error);
      message.error("스테이킹 데이터를 불러오는데 실패했습니다.");
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
        message.success(
          `NFT 언스테이킹이 완료되었습니다. 받은 보상: ${reward} PGC`
        );
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
    fetchStakedNFTs();

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="staking-page">
      <div className="page-header">
        <h1 className="mb-6 text-5xl font-extrabold text-sky-600">스테이킹</h1>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="스테이킹된 NFT"
            value={stakedNFTs.length}
            prefix={<BankOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 충전기"
            value={totalChargers}
            prefix={<ThunderboltOutlined />}
            suffix="대"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="예상 보상"
            value={Number(totalEstimatedRewards)}
            prefix={<DollarOutlined />}
            suffix="PGC"
            loading={loading}
          />
        </Col>
      </Row>

      <div className="search-box">
        <Input
          placeholder="충전 허브 검색..."
          prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
          size="middle"
        />
      </div>

      {/* 스테이킹된 NFT 목록 */}
      {loading ? (
        <div className="flex justify-center items-center h-screen">
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
                price={Number(nft.estimatedReward)}
                status="available"
                onBuy={() => handleUnstake(nft.id)}
                onSecondaryAction={() => handleClaimReward(nft.id)}
                loading={processingNFT === nft.id}
                primaryButtonText="언스테이킹"
                secondaryButtonText="보상 수령"
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default Staking;
