import { Row, Col, Tabs, Empty } from "antd";
import {
  ThunderboltOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  BankOutlined,
  EnvironmentOutlined,
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
import { StyledButton } from "../components/common/StyledButton";

interface MetadataValue {
  Text?: string;
  Nat?: bigint;
}

type MetadataEntry = [string, MetadataValue];
type Metadata = MetadataEntry[];

interface NFTData {
  id: bigint;
  name: string;
  location: string;
  price: bigint;
  chargerCount: number;
  isStaked: boolean;
}

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ownedNFTs, setOwnedNFTs] = useState<NFTData[]>([]);
  const [stakedNFTs, setStakedNFTs] = useState<NFTData[]>([]);
  const [stakingInProgress, setStakingInProgress] = useState<bigint | null>(
    null
  );

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

  const fetchNFTs = async () => {
    try {
      setLoading(true);
      const authManager = AuthManager.getInstance();
      const identity = await authManager.getIdentity();

      if (!identity) {
        setLoading(false);
        return;
      }

      const actor = await createActor();

      // 소유한 NFT 목록 조회
      const ownedTokens = await actor.icrc7_tokens_of(
        { owner: identity.getPrincipal(), subaccount: [] },
        [],
        []
      );

      // 스테이킹된 NFT 목록 조회
      const stakedTokens = await actor.getStakedNFTs(identity.getPrincipal());
      const stakedTokenSet = new Set(stakedTokens.map((id) => id.toString()));

      const nftDataPromises = ownedTokens.map(async (tokenId) => {
        const metadata = await actor.icrc7_token_metadata([tokenId]);
        let location = "위치 정보 없음";
        let chargerCount = 0;

        if (metadata && metadata.length > 0 && metadata[0] && metadata[0][0]) {
          const metadataFields = metadata[0][0] as Array<
            [string, { Text?: string; Nat?: bigint }]
          >;

          // 메타데이터의 전체 구조를 자세히 출력
          console.log(
            `NFT #${tokenId} 메타데이터 전체 구조:`,
            JSON.stringify(
              metadata,
              (key, value) => {
                if (typeof value === "bigint") {
                  return value.toString();
                }
                return value;
              },
              2
            )
          );

          // 각 필드를 순회하면서 처리
          metadataFields.forEach(([key, value]) => {
            console.log(`NFT #${tokenId} 필드:`, { key, value });

            if (key === "location" && value.Text) {
              location = value.Text;
              console.log(`위치 설정:`, location);
            } else if (key === "chargerCount" && value.Nat) {
              chargerCount = Number(value.Nat);
              console.log(`충전기 수 설정:`, chargerCount);
            }
          });
        }

        // 실제 스테이킹 상태 확인
        const isStaked = stakedTokenSet.has(tokenId.toString());

        const nftData: NFTData = {
          id: tokenId,
          name: `충전 허브 #${tokenId.toString()}`,
          location,
          price: BigInt(0),
          chargerCount,
          isStaked,
        };

        console.log(`NFT #${tokenId} 최종 데이터:`, {
          ...nftData,
          id: nftData.id.toString(),
          price: nftData.price.toString(),
        });
        return nftData;
      });

      const nftData = await Promise.all(nftDataPromises);
      console.log(
        "전체 NFT 데이터:",
        nftData.map((nft) => ({
          ...nft,
          id: nft.id.toString(),
          price: nft.price.toString(),
        }))
      );

      // 스테이킹 상태에 따라 분류
      const owned = nftData.filter((nft) => !nft.isStaked);
      const staked = nftData.filter((nft) => nft.isStaked);

      console.log(
        "보유 중인 NFT:",
        owned.map((nft) => ({
          ...nft,
          id: nft.id.toString(),
          price: nft.price.toString(),
        }))
      );
      console.log(
        "스테이킹된 NFT:",
        staked.map((nft) => ({
          ...nft,
          id: nft.id.toString(),
          price: nft.price.toString(),
        }))
      );

      setOwnedNFTs(owned);
      setStakedNFTs(staked);
    } catch (error) {
      console.error("NFT 데이터 로딩 실패:", error);
      message.error("NFT 데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async (nftId: bigint) => {
    try {
      setStakingInProgress(nftId);
      const actor = await createActor();
      const result = await actor.stakeNFT(BigInt(nftId.toString()));

      if ("ok" in result) {
        message.success("NFT 스테이킹이 완료되었습니다.");
        // NFT 목록 새로고침
        fetchNFTs();
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
        message.success(
          `NFT 언스테이킹이 완료되었습니다. 받은 보상: ${reward} PGC`
        );
        // NFT 목록 새로고침
        fetchNFTs();
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
    fetchNFTs();
  }, []);

  return (
    <div className="home-page">
      <div className="page-header">
        <h1 className="mb-6 text-5xl font-extrabold text-sky-600">PiggyCell</h1>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="보유 중인 NFT"
            value={ownedNFTs.length}
            prefix={<ShoppingCartOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="스테이킹 중인 NFT"
            value={stakedNFTs.length}
            prefix={<BankOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 충전기"
            value={[...ownedNFTs, ...stakedNFTs].reduce(
              (sum, nft) => sum + nft.chargerCount,
              0
            )}
            prefix={<ThunderboltOutlined />}
            suffix="대"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="예상 월 수익"
            value={1234}
            prefix={<DollarOutlined />}
            suffix="PGC"
            loading={loading}
          />
        </Col>
      </Row>

      <Tabs
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
                        price={Number(nft.price)}
                        status="available"
                        onBuy={() => handleStake(nft.id)}
                        loading={stakingInProgress === nft.id}
                        primaryButtonText="스테이킹"
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
                        price={Number(nft.price)}
                        status="available"
                        onBuy={() => handleUnstake(nft.id)}
                        loading={stakingInProgress === nft.id}
                        primaryButtonText="언스테이킹"
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
