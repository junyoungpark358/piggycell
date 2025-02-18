import { Card, Row, Col, Button, Statistic, Tabs, Empty } from "antd";
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

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        const authManager = AuthManager.getInstance();
        const identity = await authManager.getIdentity();

        if (!identity) {
          setLoading(false);
          return;
        }

        const agent = new HttpAgent({ identity });
        if (process.env.NODE_ENV !== "production") {
          await agent.fetchRootKey();
        }

        const canisterId = process.env.CANISTER_ID_PIGGYCELL_BACKEND;
        if (!canisterId) {
          throw new Error("Canister ID를 찾을 수 없습니다.");
        }

        const actor = Actor.createActor<_SERVICE>(idlFactory, {
          agent,
          canisterId,
        });

        // 소유한 NFT 목록 조회
        const ownedTokens = await actor.icrc7_tokens_of({
          owner: identity.getPrincipal(),
          subaccount: [],
        });

        const nftDataPromises = ownedTokens.map(async (tokenId) => {
          const metadata = await actor.icrc7_metadata(tokenId);
          let location = "위치 정보 없음";
          let chargerCount = 0;

          if (metadata && metadata.length > 0 && metadata[0]) {
            const metadataEntries = metadata[0];
            for (const [key, value] of metadataEntries) {
              if (key === "location" && "Text" in value) {
                location = value.Text;
              } else if (key === "chargerCount" && "Nat" in value) {
                chargerCount = Number(value.Nat);
              }
            }
          }

          // 스테이킹 상태 확인 (현재는 모두 false로 설정)
          const isStaked = false;

          const nftData: NFTData = {
            id: tokenId,
            name: `충전 허브 #${tokenId.toString()}`,
            location,
            price: BigInt(0), // 소유한 NFT는 가격 정보가 필요 없음
            chargerCount,
            isStaked,
          };

          return nftData;
        });

        const nftData = await Promise.all(nftDataPromises);

        // 스테이킹 상태에 따라 분류
        setOwnedNFTs(nftData.filter((nft) => !nft.isStaked));
        setStakedNFTs(nftData.filter((nft) => nft.isStaked));
      } catch (error) {
        console.error("NFT 데이터 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, []);

  const items = [
    {
      key: "owned",
      label: `보유 중인 NFT (${ownedNFTs.length})`,
      children: (
        <Row gutter={[16, 16]}>
          {ownedNFTs.length > 0 ? (
            ownedNFTs.map((nft) => (
              <Col key={nft.id.toString()} xs={24} sm={12} md={8} lg={6}>
                <Card title={nft.name} className="nft-card">
                  <div className="mb-4">
                    <p className="flex items-center mb-2 text-gray-600">
                      <EnvironmentOutlined className="mr-3 text-sky-600" />
                      <span className="mr-2 font-medium">위치:</span>{" "}
                      {nft.location}
                    </p>
                    <p className="flex items-center text-gray-600">
                      <ThunderboltOutlined className="mr-3 text-sky-600" />
                      <span className="mr-2 font-medium">충전기:</span>{" "}
                      {nft.chargerCount}대
                    </p>
                  </div>
                  <Button
                    type="primary"
                    onClick={() => navigate("/staking")}
                    block
                  >
                    스테이킹하기
                  </Button>
                </Card>
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
                <Card title={nft.name} className="nft-card">
                  <div className="mb-4">
                    <p className="flex items-center mb-2 text-gray-600">
                      <EnvironmentOutlined className="mr-3 text-sky-600" />
                      <span className="mr-2 font-medium">위치:</span>{" "}
                      {nft.location}
                    </p>
                    <p className="flex items-center text-gray-600">
                      <ThunderboltOutlined className="mr-3 text-sky-600" />
                      <span className="mr-2 font-medium">충전기:</span>{" "}
                      {nft.chargerCount}대
                    </p>
                  </div>
                  <Button
                    type="primary"
                    onClick={() => navigate("/staking")}
                    block
                  >
                    스테이킹 관리
                  </Button>
                </Card>
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
  ];

  return (
    <div className="home-page">
      <div className="page-header">
        <h1 className="mb-6 text-5xl font-extrabold text-sky-600">PiggyCell</h1>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="보유 중인 NFT"
              value={ownedNFTs.length}
              prefix={<ShoppingCartOutlined style={{ color: "#0284c7" }} />}
              suffix="개"
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="스테이킹 중인 NFT"
              value={stakedNFTs.length}
              prefix={<BankOutlined style={{ color: "#0284c7" }} />}
              suffix="개"
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="총 충전기"
              value={[...ownedNFTs, ...stakedNFTs].reduce(
                (sum, nft) => sum + nft.chargerCount,
                0
              )}
              prefix={<ThunderboltOutlined style={{ color: "#0284c7" }} />}
              suffix="대"
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="예상 월 수익"
              value={1234}
              prefix={<DollarOutlined style={{ color: "#0284c7" }} />}
              suffix="ICP"
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Tabs items={items} />
    </div>
  );
};

export default Home;
